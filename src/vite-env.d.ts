/// <reference types="vite/client" />

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

type FileListResult = {
  dir: string
  entries: Array<{ name: string; type: 'dir' | 'file' }>
}

type FileReadResult = {
  path: string
  content: string
}

type FileSearchResult = {
  keyword: string
  dir: string
  matches: string[]
}

type FileRootsResult = {
  roots: string[]
}

declare global {
  interface Window {
    omni: {
      getUIState: () => Promise<UIState>
      setMiniMode: (next: boolean) => Promise<{ isMiniMode: boolean }>
      togglePin: () => Promise<{ isPinned: boolean }>
      listTasks: () => Promise<TaskItem[]>
      createTask: (input: CreateTaskInput) => Promise<TaskItem>
      toggleTask: (id: number) => Promise<TaskItem | null>
      updateTask: (input: UpdateTaskInput) => Promise<TaskItem | null>
      deleteTask: (id: number) => Promise<{ ok: boolean }>
      getConfig: () => Promise<AppConfigSummary>
      setApiKey: (apiKey: string) => Promise<{ ok: boolean }>
      clearApiKey: () => Promise<{ ok: boolean }>
      setDefaultModel: (model: string) => Promise<{ ok: boolean }>
      setApiBaseUrl: (apiBaseUrl: string) => Promise<{ ok: boolean }>
      setModelOptions: (modelOptions: string[]) => Promise<{ ok: boolean }>
      setProtocol: (protocol: 'anthropic' | 'openai') => Promise<{ ok: boolean }>
      sendChat: (messages: ChatMessage[]) => Promise<{ reply: string }>
      listMCPServers: () => Promise<MCPServer[]>
      connectMCPServer: (serverId: string) => Promise<{ ok: boolean }>
      disconnectMCPServer: (serverId: string) => Promise<{ ok: boolean }>
      listMCPTools: (serverId?: string) => Promise<MCPTool[]>
      callMCPTool: (payload: { serverId: string; toolName: string; input?: Record<string, unknown> }) => Promise<{
        serverId: string
        toolName: string
        output: Record<string, unknown>
      }>
      fileGetRoots: () => Promise<FileRootsResult>
      fileAddRoot: (rootDir: string) => Promise<FileRootsResult>
      fileRemoveRoot: (rootDir: string) => Promise<FileRootsResult>
      fileList: (dir?: string) => Promise<FileListResult>
      fileRead: (filePath: string) => Promise<FileReadResult>
      fileSearch: (payload: { keyword: string; dir?: string }) => Promise<FileSearchResult>
    }
  }
}

export {}
