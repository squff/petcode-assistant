/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface PetAPI {
  sendMessage: (message: string, files?: string[]) => void
  stopClaude: () => void
  onClaudeStream: (callback: (data: any) => void) => () => void
  onClaudeThinking: (callback: () => void) => () => void
  onClaudeDone: (callback: () => void) => () => void
  onClaudeError: (callback: (msg: string) => void) => () => void
  dragWindow: (deltaX: number, deltaY: number) => void
  setClickThrough: (enabled: boolean) => void
  minimizeToTray: () => void
  onSwitchCharacter: (callback: (name: string) => void) => () => void
  onShowChat: (callback: () => void) => () => void
  onWindowMoved: (callback: (pos: { x: number; y: number }) => void) => () => void
  newSession: () => void
  saveSession: (id: string, messages: any[]) => void
  loadSession: (id: string) => Promise<any>
  listSessions: () => Promise<any[]>
  getFileInfo: (paths: string[]) => Promise<any[]>
}

declare interface Window {
  petAPI: PetAPI
}
