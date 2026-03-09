import { app, BrowserWindow } from 'electron'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { applyWindowMode, getHotkey, getWindowPosition, registerMainHotkey, unregisterHotkeys, WINDOW_SIZE } from './hotkey'
import { registerUIHandlers } from './ipc/ui-handler'
import { getTaskDB, registerTaskHandlers } from './ipc/task-handler'
import { registerConfigHandlers } from './ipc/config-handler'
import { registerChatHandlers } from './ipc/chat-handler'
import { registerMCPHandlers } from './ipc/mcp-handler'
import { ConfigStore } from './services/config-store'
import { ClaudeService } from './services/claude-service'
import { MCPService } from './services/mcp-service'
import { FileTools } from './services/ai-tools'
import { AgentService } from './services/agent-service'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null = null
const uiStore = {
  isMiniMode: true,
  isPinned: true,
  getWindow: () => win,
}

const configStore = new ConfigStore(path.join(app.getPath('userData'), 'config.json'))
const claudeService = new ClaudeService(configStore)
const fileTools = new FileTools(process.env.APP_ROOT)

const projectMCPConfigPath = path.join(process.env.APP_ROOT, 'mcp-config.json')
const userDataMCPConfigPath = path.join(app.getPath('userData'), 'mcp-config.json')
const mcpConfigPath = fs.existsSync(projectMCPConfigPath) ? projectMCPConfigPath : userDataMCPConfigPath
console.log('[MCP config path]', mcpConfigPath)
const mcpService = new MCPService(mcpConfigPath)

function toggleWindow() {
  if (!win) return

  if (win.isVisible()) {
    win.hide()
  } else {
    applyWindowMode(win, uiStore.isMiniMode, uiStore.isPinned)
    win.show()
    win.focus()
  }
}

function createWindow() {
  const defaultSize = WINDOW_SIZE.mini
  const [x, y] = getWindowPosition(defaultSize.width, defaultSize.height)

  win = new BrowserWindow({
    x,
    y,
    width: defaultSize.width,
    height: defaultSize.height,
    minWidth: WINDOW_SIZE.mini.width,
    minHeight: WINDOW_SIZE.mini.height,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    maximizable: false,
    minimizable: false,
    show: false,
    title: 'OmniAgent',
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }

  win.on('blur', () => {
    if (win && !uiStore.isPinned) {
      win.hide()
    }
  })

  registerMainHotkey(toggleWindow)
}

app.whenReady().then(() => {
  createWindow()
  registerUIHandlers(uiStore)
  registerTaskHandlers()

  const agentService = new AgentService(getTaskDB(), fileTools)

  registerConfigHandlers(configStore)
  registerChatHandlers(claudeService, agentService)
  registerMCPHandlers(mcpService)
})

app.on('will-quit', () => {
  unregisterHotkeys()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

console.log(`OmniAgent ready. Hotkey: ${getHotkey()}`)
