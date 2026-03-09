import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import { applyWindowMode, getHotkey } from '../hotkey'

type UIStore = {
  isMiniMode: boolean
  isPinned: boolean
  getWindow: () => BrowserWindow | null
}

export function registerUIHandlers(store: UIStore) {
  ipcMain.handle('omni:get-ui-state', () => {
    return {
      isMiniMode: store.isMiniMode,
      isPinned: store.isPinned,
      hotkey: getHotkey(),
    }
  })

  ipcMain.handle('omni:set-mini-mode', (_event, next: boolean) => {
    store.isMiniMode = next
    const win = store.getWindow()
    if (win) {
      applyWindowMode(win, store.isMiniMode, store.isPinned)
    }
    return { isMiniMode: store.isMiniMode }
  })

  ipcMain.handle('omni:toggle-pin', () => {
    store.isPinned = !store.isPinned
    const win = store.getWindow()
    if (win) {
      win.setAlwaysOnTop(store.isPinned, 'screen-saver')
    }
    return { isPinned: store.isPinned }
  })
}
