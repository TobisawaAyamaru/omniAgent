import { ipcMain } from 'electron'
import { MCPService } from '../services/mcp-service'

export function registerMCPHandlers(mcpService: MCPService) {
  ipcMain.handle('mcp:list-servers', () => {
    return mcpService.listServers()
  })

  ipcMain.handle('mcp:connect-server', (_event, serverId: string) => {
    if (typeof serverId !== 'string' || serverId.trim().length === 0) {
      throw new Error('serverId 无效')
    }
    return mcpService.connectServer(serverId.trim())
  })

  ipcMain.handle('mcp:disconnect-server', (_event, serverId: string) => {
    if (typeof serverId !== 'string' || serverId.trim().length === 0) {
      throw new Error('serverId 无效')
    }
    return mcpService.disconnectServer(serverId.trim())
  })

  ipcMain.handle('mcp:list-tools', (_event, serverId?: string) => {
    if (serverId !== undefined && typeof serverId !== 'string') {
      throw new Error('serverId 无效')
    }
    return mcpService.listTools(serverId?.trim())
  })

  ipcMain.handle('mcp:call-tool', (_event, payload: { serverId: string; toolName: string; input?: Record<string, unknown> }) => {
    if (!payload || typeof payload.serverId !== 'string' || typeof payload.toolName !== 'string') {
      throw new Error('参数无效')
    }

    return mcpService.callTool(
      payload.serverId.trim(),
      payload.toolName.trim(),
      payload.input ?? {},
    )
  })
}
