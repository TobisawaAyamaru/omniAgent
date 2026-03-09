/// <reference types="vite-plugin-electron/electron-env" />

declare namespace NodeJS {
  interface ProcessEnv {
    APP_ROOT: string
    VITE_PUBLIC: string
  }
}

type UIState = {
  isMiniMode: boolean
  isPinned: boolean
  hotkey: string
}

interface Window {
  omni: {
    getUIState: () => Promise<UIState>
    setMiniMode: (next: boolean) => Promise<{ isMiniMode: boolean }>
    togglePin: () => Promise<{ isPinned: boolean }>
  }
}
