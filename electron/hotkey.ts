import { BrowserWindow, globalShortcut, screen } from 'electron'

const HOTKEY = 'CommandOrControl+Space'

export const WINDOW_SIZE = {
  mini: { width: 600, height: 60 },
  expanded: { width: 900, height: 640 },
} as const

export function getWindowPosition(width: number, height: number): [number, number] {
  const cursorPoint = screen.getCursorScreenPoint()
  const display = screen.getDisplayNearestPoint(cursorPoint)
  const { x, y, width: displayWidth, height: displayHeight } = display.workArea

  const windowX = Math.round(x + (displayWidth - width) / 2)
  const suggestedY = cursorPoint.y - Math.round(height * 0.15)
  const minY = y + 24
  const maxY = y + displayHeight - height - 24
  const windowY = Math.min(Math.max(suggestedY, minY), maxY)

  return [windowX, windowY]
}

export function applyWindowMode(win: BrowserWindow, isMiniMode: boolean, isPinned: boolean) {
  const nextSize = isMiniMode ? WINDOW_SIZE.mini : WINDOW_SIZE.expanded
  const [x, y] = getWindowPosition(nextSize.width, nextSize.height)

  win.setAlwaysOnTop(isPinned, 'screen-saver')
  win.setSize(nextSize.width, nextSize.height, true)
  win.setPosition(x, y, true)
  win.setResizable(!isMiniMode)
}

export function registerMainHotkey(toggleWindow: () => void) {
  globalShortcut.register(HOTKEY, toggleWindow)
}

export function unregisterHotkeys() {
  globalShortcut.unregisterAll()
}

export function getHotkey() {
  return HOTKEY
}
