import { contextBridge, ipcRenderer } from 'electron'

const petAPI = {
  // === Chat ===
  sendMessage: (message: string, files?: string[]) => {
    ipcRenderer.send('send-message', { message, files })
  },
  stopClaude: () => ipcRenderer.send('stop-claude'),

  // === Claude 事件 ===
  onClaudeStream: (callback: (data: any) => void) => {
    const handler = (_: any, data: any) => callback(data)
    ipcRenderer.on('claude-stream', handler)
    return () => ipcRenderer.removeListener('claude-stream', handler)
  },
  onClaudeThinking: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('claude-thinking', handler)
    return () => ipcRenderer.removeListener('claude-thinking', handler)
  },
  onClaudeDone: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('claude-done', handler)
    return () => ipcRenderer.removeListener('claude-done', handler)
  },
  onClaudeError: (callback: (msg: string) => void) => {
    const handler = (_: any, msg: string) => callback(msg)
    ipcRenderer.on('claude-error', handler)
    return () => ipcRenderer.removeListener('claude-error', handler)
  },

  // === 窗口控制 ===
  dragWindow: (deltaX: number, deltaY: number) => {
    ipcRenderer.send('window-drag', { deltaX, deltaY })
  },
  setClickThrough: (enabled: boolean) => {
    ipcRenderer.send('set-click-through', enabled)
  },
  minimizeToTray: () => ipcRenderer.send('minimize-to-tray'),

  // === 角色切换 (来自 tray) ===
  onSwitchCharacter: (callback: (name: string) => void) => {
    const handler = (_: any, name: string) => callback(name)
    ipcRenderer.on('switch-character', handler)
    return () => ipcRenderer.removeListener('switch-character', handler)
  },
  onShowChat: (callback: () => void) => {
    const handler = () => callback()
    ipcRenderer.on('show-chat', handler)
    return () => ipcRenderer.removeListener('show-chat', handler)
  },
  onWindowMoved: (callback: (pos: { x: number; y: number }) => void) => {
    const handler = (_: any, pos: { x: number; y: number }) => callback(pos)
    ipcRenderer.on('window-moved', handler)
    return () => ipcRenderer.removeListener('window-moved', handler)
  },

  // === 会话管理 ===
  newSession: () => ipcRenderer.send('new-session'),
  saveSession: (id: string, messages: any[]) => {
    ipcRenderer.send('save-session', { id, messages })
  },
  loadSession: (id: string): Promise<any> => ipcRenderer.invoke('load-session', id),
  listSessions: (): Promise<any[]> => ipcRenderer.invoke('list-sessions'),

  // === 文件 ===
  getFileInfo: (paths: string[]): Promise<any[]> => ipcRenderer.invoke('get-file-info', paths),
}

contextBridge.exposeInMainWorld('petAPI', petAPI)
