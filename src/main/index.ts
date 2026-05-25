import { app, BrowserWindow, ipcMain, Tray, Menu, screen, nativeImage } from 'electron'
import path from 'path'
import { spawn, ChildProcess } from 'child_process'
import fs from 'fs'
import os from 'os'

// ============ 路径工具 (跨平台) ============
const isWin = process.platform === 'win32'
const sep = path.sep

function getBaseDir(): string {
  // 开发模式：项目根目录；打包后：exe 所在目录
  if (app.isPackaged) {
    return path.dirname(process.execPath)
  }
  return path.join(__dirname, '..', '..')
}

function getIconPath(): string {
  const base = getBaseDir()
  // 优先用 .ico (Windows) / .png (Linux/macOS)
  if (isWin) return path.join(base, 'resources', 'icon.ico')
  return path.join(base, 'resources', 'icon.png')
}

function getTrayIconPath(): string {
  const base = getBaseDir()
  if (isWin) return path.join(base, 'resources', 'tray.ico')
  return path.join(base, 'resources', 'tray.png')
}

// ============ Constants ============
const PET_WIDTH = 320
const PET_HEIGHT = 420
const SESSION_DIR = path.join(app.getPath('userData'), 'sessions')

// Ensure session dir
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true })
}

// ============ 全局状态 ============
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let claudeProcess: ChildProcess | null = null
let isClaudeBusy = false

// ============ 窗口创建 ============
function createWindow(): void {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width: screenW, height: screenH } = primaryDisplay.workAreaSize

  mainWindow = new BrowserWindow({
    width: PET_WIDTH,
    height: PET_HEIGHT,
    x: screenW - PET_WIDTH - 60,
    y: screenH - PET_HEIGHT - 60,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    // Windows 特有：透明窗口需要关闭 GPU 加速
    ...(isWin ? { backgroundColor: '#00000000' } : {}),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  // 加载渲染器
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'))
  }

  mainWindow.setIgnoreMouseEvents(false)

  mainWindow.on('move', () => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition()
      mainWindow.webContents.send('window-moved', { x, y })
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ============ 系统托盘 ============
function createTray(): void {
  let icon: Electron.NativeImage

  // 尝试从文件加载图标，失败则生成一个
  const trayIconPath = getTrayIconPath()
  if (fs.existsSync(trayIconPath)) {
    icon = nativeImage.createFromPath(trayIconPath)
  } else {
    // 生成一个简单的圆形图标
    const size = 32
    const buf = Buffer.alloc(size * size * 4)
    for (let i = 0; i < size * size; i++) {
      const x = (i % size) - size / 2
      const y = Math.floor(i / size) - size / 2
      const dist = Math.sqrt(x * x + y * y)
      if (dist < size / 2 - 1) {
        const gradient = Math.max(0, 1 - dist / (size / 2))
        buf[i * 4] = Math.round(108 + gradient * 50)     // R
        buf[i * 4 + 1] = Math.round(92 + gradient * 80)   // G
        buf[i * 4 + 2] = Math.round(231 - gradient * 30)  // B
        buf[i * 4 + 3] = 255                               // A
      } else {
        buf[i * 4 + 3] = 0
      }
    }
    icon = nativeImage.createFromBuffer(buf, { width: size, height: size })
  }

  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '💬 打开对话',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('show-chat')
      },
    },
    { type: 'separator' },
    {
      label: '🤍 一二',
      type: 'radio',
      checked: true,
      click: () => mainWindow?.webContents.send('switch-character', 'yier'),
    },
    {
      label: '💗 布布',
      type: 'radio',
      click: () => mainWindow?.webContents.send('switch-character', 'bubu'),
    },
    { type: 'separator' },
    {
      label: '📌 置顶窗口',
      type: 'checkbox',
      checked: true,
      click: (menuItem) => {
        mainWindow?.setAlwaysOnTop(menuItem.checked)
      },
    },
    {
      label: '🔧 开发者工具',
      click: () => mainWindow?.webContents.openDevTools({ mode: 'detach' }),
    },
    { type: 'separator' },
    {
      label: '❌ 退出',
      click: () => {
        app.quit()
      },
    },
  ])

  tray.setToolTip('PetCode Assistant')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })
}

// ============ Claude Code 接入 ============
// 使用 `claude -p "message" --output-format stream-json` 模式
// 每次用户消息启动一次 claude 子进程，流式读取 stdout
function findClaudeBinary(): string {
  // 1) 环境变量
  if (process.env.CLAUDE_PATH) return process.env.CLAUDE_PATH

  // 2) 常见安装路径
  const candidates = isWin
    ? [
        path.join(os.homedir(), '.npm-global', 'claude.cmd'),
        path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'claude.cmd'),
        'claude.cmd',
      ]
    : [
        '/usr/local/bin/claude',
        path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
        path.join(os.homedir(), '.local', 'bin', 'claude'),
        'claude',
      ]

  for (const c of candidates) {
    try {
      if (fs.existsSync(c)) return c
    } catch {
      // ignore
    }
  }
  return 'claude' // fallback to PATH
}

function sendToClaude(message: string, files?: string[]): void {
  if (isClaudeBusy) {
    mainWindow?.webContents.send('claude-error', '正在处理中，请稍候...')
    return
  }

  isClaudeBusy = true
  mainWindow?.webContents.send('claude-thinking')

  // 构建完整 prompt（含文件内容）
  let fullMessage = message
  if (files && files.length > 0) {
    const parts: string[] = []
    for (const fp of files) {
      try {
        const stat = fs.statSync(fp)
        if (stat.isDirectory()) {
          parts.push(`📁 目录: ${fp}\n${getDirectoryTree(fp, 3)}`)
        } else if (stat.size < 200_000) {
          const content = fs.readFileSync(fp, 'utf-8')
          const ext = path.extname(fp).slice(1)
          parts.push(`📄 文件: ${fp}\n\`\`\`${ext}\n${content}\n\`\`\``)
        } else {
          parts.push(`📄 文件: ${fp} (${(stat.size / 1024).toFixed(1)}KB，过大未读取)`)
        }
      } catch (e: any) {
        parts.push(`❌ 无法读取 ${fp}: ${e.message}`)
      }
    }
    if (parts.length > 0) {
      fullMessage = `${message}\n\n--- 附带文件 ---\n${parts.join('\n\n')}`
    }
  }

  const claudeBin = findClaudeBinary()
  const cwd = os.homedir()

  // 使用 -p 模式 + stream-json
  const args = ['-p', fullMessage, '--output-format', 'stream-json']

  try {
    claudeProcess = spawn(claudeBin, args, {
      cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWin, // Windows 需要 shell: true 才能找到 .cmd
    })

    let buffer = ''

    claudeProcess.stdout?.on('data', (data: Buffer) => {
      buffer += data.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        try {
          const parsed = JSON.parse(trimmed)
          mainWindow?.webContents.send('claude-stream', parsed)
        } catch {
          mainWindow?.webContents.send('claude-stream', { type: 'raw', text: trimmed })
        }
      }
    })

    claudeProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString().trim()
      if (text) console.error('[claude stderr]', text)
    })

    claudeProcess.on('close', (code) => {
      // 处理剩余 buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim())
          mainWindow?.webContents.send('claude-stream', parsed)
        } catch {
          mainWindow?.webContents.send('claude-stream', { type: 'raw', text: buffer.trim() })
        }
      }
      claudeProcess = null
      isClaudeBusy = false
      mainWindow?.webContents.send('claude-done')
    })

    claudeProcess.on('error', (err) => {
      console.error('Failed to start Claude:', err)
      claudeProcess = null
      isClaudeBusy = false
      mainWindow?.webContents.send('claude-error', `无法启动 Claude Code: ${err.message}\n请确认已安装: npm install -g @anthropic-ai/claude-code`)
      mainWindow?.webContents.send('claude-done')
    })
  } catch (err: any) {
    claudeProcess = null
    isClaudeBusy = false
    mainWindow?.webContents.send('claude-error', err.message)
    mainWindow?.webContents.send('claude-done')
  }
}

function getDirectoryTree(dirPath: string, maxDepth: number, prefix = ''): string {
  if (maxDepth <= 0) return `${prefix}...`
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })
    const filtered = entries.filter((e) => !e.name.startsWith('.') && e.name !== 'node_modules')
    const lines: string[] = []
    const show = filtered.slice(0, 30)
    for (const entry of show) {
      const icon = entry.isDirectory() ? '📁' : '📄'
      lines.push(`${prefix}${icon} ${entry.name}`)
      if (entry.isDirectory() && maxDepth > 1) {
        lines.push(getDirectoryTree(path.join(dirPath, entry.name), maxDepth - 1, `${prefix}  `))
      }
    }
    if (filtered.length > 30) lines.push(`${prefix}... 还有 ${filtered.length - 30} 个`)
    return lines.join('\n')
  } catch {
    return `${prefix}(无法读取)`
  }
}

// ============ IPC ============
function setupIPC(): void {
  ipcMain.on('send-message', (_, data: { message: string; files?: string[] }) => {
    sendToClaude(data.message, data.files)
  })

  ipcMain.on('stop-claude', () => {
    if (claudeProcess) {
      claudeProcess.kill()
      claudeProcess = null
      isClaudeBusy = false
      mainWindow?.webContents.send('claude-done')
    }
  })

  ipcMain.on('window-drag', (_, data: { deltaX: number; deltaY: number }) => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition()
      mainWindow.setPosition(x + data.deltaX, y + data.deltaY)
    }
  })

  ipcMain.on('set-click-through', (_, enabled: boolean) => {
    mainWindow?.setIgnoreMouseEvents(enabled, { forward: true })
  })

  ipcMain.on('minimize-to-tray', () => {
    mainWindow?.hide()
  })

  ipcMain.on('save-session', (_, data: { id: string; messages: any[] }) => {
    const filePath = path.join(SESSION_DIR, `${data.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  })

  ipcMain.handle('load-session', (_, sessionId: string) => {
    const filePath = path.join(SESSION_DIR, `${sessionId}.json`)
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
    return null
  })

  ipcMain.handle('list-sessions', () => {
    try {
      const files = fs.readdirSync(SESSION_DIR).filter((f) => f.endsWith('.json'))
      return files.map((f) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, f), 'utf-8'))
          return { id: data.id, preview: data.messages?.[0]?.content?.slice(0, 50) || '' }
        } catch {
          return { id: f.replace('.json', ''), preview: '(读取失败)' }
        }
      })
    } catch {
      return []
    }
  })

  ipcMain.handle('get-file-info', async (_, filePaths: string[]) => {
    return filePaths.map((fp) => {
      try {
        const stat = fs.statSync(fp)
        return {
          path: fp,
          name: path.basename(fp),
          isDirectory: stat.isDirectory(),
          size: stat.size,
          ext: path.extname(fp).slice(1).toLowerCase(),
        }
      } catch {
        return { path: fp, name: path.basename(fp), error: true }
      }
    })
  })
}

// ============ 生命周期 ============
// Windows: 透明窗口需要关闭 GPU 加速（否则透明失效）
if (isWin) {
  app.disableHardwareAcceleration()
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  setupIPC()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.on('before-quit', () => {
  if (claudeProcess) {
    claudeProcess.kill()
    claudeProcess = null
  }
})
