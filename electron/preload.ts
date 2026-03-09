import { contextBridge, ipcRenderer } from 'electron'

type UIState = {
  isMiniMode: boolean
  isPinned: boolean
  hotkey: string
}

type TaskPriority = 'low' | 'medium' | 'high'

type TaskItem = {
  id: number
  title: string
  completed: number
  priority: TaskPriority
  dueDate: string | null
  tags: string
  notes: string
  createdAt: string
  updatedAt: string
}

type CreateTaskInput = {
  title: string
  priority?: TaskPriority
  dueDate?: string | null
  tags?: string
  notes?: string
}

type UpdateTaskInput = {
  id: number
  title?: string
  priority?: TaskPriority
  dueDate?: string | null
  tags?: string
  notes?: string
}

type AppConfigSummary = {
  hasAnthropicApiKey: boolean
  defaultModel: string
  apiBaseUrl: string
  modelOptions: string[]
  protocol: 'anthropic' | 'openai'
}

type ChatMessage = {
  role: 'user' | 'assistant'
  content: string
}

type MCPServer = {
  id: string
  name: string
  command: string
  args?: string[]
  enabled: boolean
  connected: boolean
}

type MCPTool = {
  serverId: string
  name: string
  description: string
  inputSchema: string
}

const omni = {
  getUIState: () => ipcRenderer.invoke('omni:get-ui-state') as Promise<UIState>,
  setMiniMode: (next: boolean) => ipcRenderer.invoke('omni:set-mini-mode', next) as Promise<{ isMiniMode: boolean }>,
  togglePin: () => ipcRenderer.invoke('omni:toggle-pin') as Promise<{ isPinned: boolean }>,
  listTasks: () => ipcRenderer.invoke('task:list') as Promise<TaskItem[]>,
  createTask: (input: CreateTaskInput) => ipcRenderer.invoke('task:create', input) as Promise<TaskItem>,
  toggleTask: (id: number) => ipcRenderer.invoke('task:toggle', id) as Promise<TaskItem | null>,
  updateTask: (input: UpdateTaskInput) => ipcRenderer.invoke('task:update', input) as Promise<TaskItem | null>,
  deleteTask: (id: number) => ipcRenderer.invoke('task:delete', id) as Promise<{ ok: boolean }>,
  getConfig: () => ipcRenderer.invoke('config:get') as Promise<AppConfigSummary>,
  setApiKey: (apiKey: string) => ipcRenderer.invoke('config:set-api-key', apiKey) as Promise<{ ok: boolean }>,
  clearApiKey: () => ipcRenderer.invoke('config:clear-api-key') as Promise<{ ok: boolean }>,
  setDefaultModel: (model: string) => ipcRenderer.invoke('config:set-default-model', model) as Promise<{ ok: boolean }>,
  setApiBaseUrl: (apiBaseUrl: string) => ipcRenderer.invoke('config:set-api-base-url', apiBaseUrl) as Promise<{ ok: boolean }>,
  setModelOptions: (modelOptions: string[]) => ipcRenderer.invoke('config:set-model-options', modelOptions) as Promise<{ ok: boolean }>,
  setProtocol: (protocol: 'anthropic' | 'openai') => ipcRenderer.invoke('config:set-protocol', protocol) as Promise<{ ok: boolean }>,
  sendChat: (messages: ChatMessage[]) => ipcRenderer.invoke('chat:send', { messages }) as Promise<{ reply: string }>,
  listMCPServers: () => ipcRenderer.invoke('mcp:list-servers') as Promise<MCPServer[]>,
  connectMCPServer: (serverId: string) => ipcRenderer.invoke('mcp:connect-server', serverId) as Promise<{ ok: boolean }>,
  disconnectMCPServer: (serverId: string) => ipcRenderer.invoke('mcp:disconnect-server', serverId) as Promise<{ ok: boolean }>,
  listMCPTools: (serverId?: string) => ipcRenderer.invoke('mcp:list-tools', serverId) as Promise<MCPTool[]>,
  callMCPTool: (payload: { serverId: string; toolName: string; input?: Record<string, unknown> }) =>
    ipcRenderer.invoke('mcp:call-tool', payload) as Promise<{ serverId: string; toolName: string; output: Record<string, unknown> }>,
}

contextBridge.exposeInMainWorld('omni', omni)
