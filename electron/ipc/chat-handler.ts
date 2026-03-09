import { ipcMain } from 'electron'
import { ClaudeService, ChatMessage } from '../services/claude-service'
import { AgentService } from '../services/agent-service'

export function registerChatHandlers(claudeService: ClaudeService, agentService: AgentService) {
  ipcMain.handle('chat:send', async (_event, payload: { messages: ChatMessage[] }) => {
    if (!payload || !Array.isArray(payload.messages) || payload.messages.length === 0) {
      throw new Error('消息不能为空')
    }

    const safeMessages = payload.messages.filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.trim().length > 0,
    )

    if (safeMessages.length === 0) {
      throw new Error('消息格式无效')
    }

    const toolRun = await agentService.runReAct(safeMessages, (prompt) =>
      claudeService.sendMessage([{ role: 'user', content: prompt }]),
    )

    if (toolRun.handled) {
      const lastUser = [...safeMessages].reverse().find((m) => m.role === 'user')
      const finalPrompt = [
        '你已执行一个本地工具，请基于结果直接回答用户。',
        '不要再次调用工具，不要输出 JSON。',
        `用户原始问题：${lastUser?.content ?? ''}`,
        `已调用工具：${toolRun.toolName ?? ''}`,
        `工具参数：${JSON.stringify(toolRun.toolArgs ?? {}, null, 2)}`,
        `工具结果：${JSON.stringify(toolRun.toolResult ?? {}, null, 2)}`,
        '请用简洁中文给出最终答复。',
      ].join('\n\n')

      const finalReply = await claudeService.sendMessage([{ role: 'user', content: finalPrompt }])
      return { reply: finalReply }
    }

    const reply = await claudeService.sendMessage(safeMessages)
    return { reply }
  })
}
