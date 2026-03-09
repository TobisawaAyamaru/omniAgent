export type WorkspaceTab = 'chat' | 'tasks' | 'files' | 'mcp' | 'settings'

export type WindowMode = 'mini' | 'expanded'

export type MCPHistoryItem = {
  id: string
  timestamp: string
  serverId: string
  toolName: string
  input: Record<string, unknown>
  output?: Record<string, unknown>
  error?: string
}

export const TAB_LABELS: Record<WorkspaceTab, string> = {
  chat: '对话',
  tasks: '任务',
  files: '文件',
  mcp: 'MCP',
  settings: '设置',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
}
