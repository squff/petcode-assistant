import { app, BrowserWindow, ipcMain, Tray, Menu, screen, nativeImage } from 'electron'
import path from 'path'
import { spawn, ChildProcess, execSync } from 'child_process'
import fs from 'fs'
import os from 'os'

// ============ Constants ============
const isWin = process.platform === 'win32'
const PET_WIDTH = 320
const PET_HEIGHT = 420
const SESSION_DIR = path.join(app.getPath('userData'), 'sessions')

if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true })
}

// ============ Global State ============
let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let claudeProcess: ChildProcess | null = null
let isClaudeBusy = false
let claudeDoneSent = false
let currentSessionId: string | null = null

// ============ Window ============
function createWindow(): void {
  const { width: screenW, height: screenH } = screen.getPrimaryDisplay().workAreaSize

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
    ...(isWin ? { backgroundColor: '#00000000' } : {}),
    ...(isWin ? { thickFrame: true } : {}),
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

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
  mainWindow.on('closed', () => { mainWindow = null })
}

// ============ Tray ============
function createTray(): void {
  const size = 32
  const buf = Buffer.alloc(size * size * 4)
  for (let i = 0; i < size * size; i++) {
    const px = (i % size) - size / 2
    const py = Math.floor(i / size) - size / 2
    const dist = Math.sqrt(px * px + py * py)
    if (dist < size / 2 - 1) {
      const g = Math.max(0, 1 - dist / (size / 2))
      buf[i * 4] = Math.round(108 + g * 50)
      buf[i * 4 + 1] = Math.round(92 + g * 80)
      buf[i * 4 + 2] = Math.round(231 - g * 30)
      buf[i * 4 + 3] = 255
    }
  }
  const icon = nativeImage.createFromBuffer(buf, { width: size, height: size })
  tray = new Tray(icon.resize({ width: 16, height: 16 }))

  const contextMenu = Menu.buildFromTemplate([
    { label: '💬 打开对话', click: () => { mainWindow?.show(); mainWindow?.webContents.send('show-chat') } },
    { type: 'separator' },
    { label: '🤍 一二', type: 'radio', checked: true, click: () => mainWindow?.webContents.send('switch-character', 'yier') },
    { label: '💗 布布', type: 'radio', click: () => mainWindow?.webContents.send('switch-character', 'bubu') },
    { type: 'separator' },
    { label: '📌 置顶窗口', type: 'checkbox', checked: true, click: (mi) => { mainWindow?.setAlwaysOnTop(mi.checked) } },
    { label: '🔧 开发者工具', click: () => mainWindow?.webContents.openDevTools({ mode: 'detach' }) },
    { type: 'separator' },
    { label: '❌ 退出', click: () => app.quit() },
  ])

  tray.setToolTip('PetCode Assistant')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => { mainWindow?.show(); mainWindow?.focus() })
}

// ============ Claude Code ============
function findClaudeBinary(): string {
  if (process.env.CLAUDE_PATH) return process.env.CLAUDE_PATH

  if (isWin) {
    const candidates = [
      path.join(os.homedir(), '.npm-global', 'claude.cmd'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'claude.cmd'),
      path.join(os.homedir(), '.npm-global', 'claude.exe'),
      path.join(os.homedir(), 'AppData', 'Roaming', 'npm', 'claude.exe'),
    ]
    for (const c of candidates) {
      try { if (fs.existsSync(c)) return c } catch { /* skip */ }
    }
    try {
      const result = execSync('where claude', { encoding: 'utf-8', timeout: 5000 }).trim().replace(/\r/g, '')
      if (result) return result.split('\n')[0].trim()
    } catch { /* not found */ }
    return 'claude.cmd'
  } else {
    const candidates = [
      '/usr/local/bin/claude',
      path.join(os.homedir(), '.npm-global', 'bin', 'claude'),
      path.join(os.homedir(), '.local', 'bin', 'claude'),
    ]
    for (const c of candidates) {
      try { if (fs.existsSync(c)) return c } catch { /* skip */ }
    }
    try {
      const result = execSync('which claude', { encoding: 'utf-8', timeout: 5000 }).trim()
      if (result) return result
    } catch { /* not found */ }
    return 'claude'
  }
}

function writePromptFile(content: string): string {
  const tmpFile = path.join(os.tmpdir(), `petcode-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`)
  fs.writeFileSync(tmpFile, content, 'utf-8')
  return tmpFile
}

function sendToClaude(message: string, files?: string[]): void {
  if (isClaudeBusy) {
    mainWindow?.webContents.send('claude-error', '正在处理中，请稍候...')
    return
  }

  isClaudeBusy = true
  claudeDoneSent = false
  mainWindow?.webContents.send('claude-thinking')

  // 构建 prompt（含文件内容）
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

  // 多轮上下文
  const baseArgs = ['--output-format', 'stream-json', '--verbose']
  if (currentSessionId) {
    baseArgs.push('--resume', currentSessionId)
  }

  // ---- 选择 spawn 策略 ----
  let promptFile: string | null = null
  let spawnCmd: string
  let spawnArgs: string[]
  let spawnShell: boolean

  if (isWin) {
    // Windows: .cmd 需要 shell:true
    // Windows 统一用 PowerShell + 临时文件，避免 shell:true 特殊字符问题
    promptFile = writePromptFile(fullMessage)
    // 用 PowerShell -EncodedCommand 传递 Base64 编码的命令，彻底避免转义问题
    const psCommand = `$c = Get-Content -Raw -Path '${promptFile.replace(/'/g, "''")}'; & '${claudeBin.replace(/'/g, "''")}' -p $c ${baseArgs.map(a => `'${a.replace(/'/g, "''")}'`).join(' ')}`
    const encodedCmd = Buffer.from(psCommand, 'utf16le').toString('base64')
    spawnCmd = 'powershell'
    spawnArgs = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', encodedCmd]
    spawnShell = false
  } else {
    // Linux/Mac: prompt 直接当参数（Linux ARG_MAX 通常 2MB，足够）
    spawnCmd = claudeBin
    spawnArgs = ['-p', fullMessage, ...baseArgs]
    spawnShell = false
  }

  try {
    claudeProcess = spawn(spawnCmd, spawnArgs, {
      cwd,
      env: { ...process.env },
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: spawnShell,
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
          if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) {
                mainWindow?.webContents.send('claude-stream', {
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text: block.text },
                })
              }
            }
          } else if (parsed.type === 'result') {
            if (parsed.session_id) currentSessionId = parsed.session_id
            if (parsed.result) {
              mainWindow?.webContents.send('claude-stream', { type: 'result', result: parsed.result })
            }
          } else {
            mainWindow?.webContents.send('claude-stream', parsed)
          }
        } catch {
          mainWindow?.webContents.send('claude-stream', { type: 'raw', text: trimmed })
        }
      }
    })

    claudeProcess.stderr?.on('data', (data: Buffer) => {
      const text = data.toString().trim()
      if (text) console.error('[claude stderr]', text)
    })

    claudeProcess.on('close', () => {
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim())
          if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const block of parsed.message.content) {
              if (block.type === 'text' && block.text) {
                mainWindow?.webContents.send('claude-stream', {
                  type: 'content_block_delta',
                  delta: { type: 'text_delta', text: block.text },
                })
              }
            }
          } else if (parsed.type === 'result' && parsed.result) {
            if (parsed.session_id) currentSessionId = parsed.session_id
            mainWindow?.webContents.send('claude-stream', { type: 'result', result: parsed.result })
          }
        } catch {
          mainWindow?.webContents.send('claude-stream', { type: 'raw', text: buffer.trim() })
        }
      }
      cleanupClaude()
    })

    claudeProcess.on('error', (err) => {
      console.error('Failed to start Claude:', err)
      mainWindow?.webContents.send('claude-error', `无法启动 Claude Code: ${err.message}\n请确认已安装: npm install -g @anthropic-ai/claude-code`)
      cleanupClaude()
    })
  } catch (err: any) {
    mainWindow?.webContents.send('claude-error', err.message)
    cleanupClaude()
  }

  // 延迟清理临时文件
  if (promptFile) {
    setTimeout(() => { try { fs.unlinkSync(promptFile!) } catch { /* ignore */ } }, 15000)
  }
}

function cleanupClaude(): void {
  claudeProcess = null
  isClaudeBusy = false
  if (!claudeDoneSent) {
    claudeDoneSent = true
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
      cleanupClaude()
    }
  })

  ipcMain.on('new-session', () => { currentSessionId = null })

  ipcMain.on('window-drag', (_, data: { deltaX: number; deltaY: number }) => {
    if (mainWindow) {
      const [x, y] = mainWindow.getPosition()
      mainWindow.setPosition(x + data.deltaX, y + data.deltaY)
    }
  })

  ipcMain.on('set-click-through', (_, enabled: boolean) => {
    mainWindow?.setIgnoreMouseEvents(enabled, { forward: true })
  })

  ipcMain.on('minimize-to-tray', () => { mainWindow?.hide() })

  ipcMain.on('save-session', (_, data: { id: string; messages: any[] }) => {
    const filePath = path.join(SESSION_DIR, `${data.id}.json`)
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
  })

  ipcMain.handle('load-session', (_, sessionId: string) => {
    const filePath = path.join(SESSION_DIR, `${sessionId}.json`)
    if (fs.existsSync(filePath)) return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    return null
  })

  ipcMain.handle('list-sessions', () => {
    try {
      const files = fs.readdirSync(SESSION_DIR).filter((f) => f.endsWith('.json'))
      return files.map((f) => {
        try {
          const data = JSON.parse(fs.readFileSync(path.join(SESSION_DIR, f), 'utf-8'))
          return { id: data.id, preview: data.messages?.[0]?.content?.slice(0, 50) || '' }
        } catch { return { id: f.replace('.json', ''), preview: '(读取失败)' } }
      })
    } catch { return [] }
  })

  ipcMain.handle('get-file-info', async (_, filePaths: string[]) => {
    return filePaths.map((fp) => {
      try {
        const stat = fs.statSync(fp)
        return { path: fp, name: path.basename(fp), isDirectory: stat.isDirectory(), size: stat.size, ext: path.extname(fp).slice(1).toLowerCase() }
      } catch { return { path: fp, name: path.basename(fp), error: true } }
    })
  })
}

// ============ Lifecycle ============
if (isWin) app.disableHardwareAcceleration()

app.whenReady().then(() => {
  createWindow()
  createTray()
  setupIPC()
})

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
app.on('before-quit', () => { if (claudeProcess) { claudeProcess.kill(); claudeProcess = null } })

// 未捕获异常处理 — 防止进程静默崩溃
process.on('uncaughtException', (err) => {
  console.error('[FATAL] Uncaught exception:', err)
})
process.on('unhandledRejection', (reason) => {
  console.error('[FATAL] Unhandled rejection:', reason)
})
