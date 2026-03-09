import type { ChatMessage } from './claude-service'
import type { FileTools } from './ai-tools'
import type { CreateTaskInput, UpdateTaskInput, TaskDB } from './task-db'

type ToolSpec = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}

type ToolCall = {
  tool: string
  args: Record<string, unknown>
}

type ReActOutcome = {
  handled: boolean
  reply: string
  toolName?: string
  toolArgs?: Record<string, unknown>
  toolResult?: unknown
}

const TOOL_SPECS: ToolSpec[] = [
  {
    name: 'task.list',
    description: '列出任务',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'task.create',
    description: '创建任务',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        dueDate: { type: 'string' },
        tags: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'task.toggle',
    description: '切换任务完成状态',
    inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
  },
  {
    name: 'task.update',
    description: '更新任务',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number' },
        title: { type: 'string' },
        priority: { type: 'string', enum: ['low', 'medium', 'high'] },
        dueDate: { type: 'string' },
        tags: { type: 'string' },
        notes: { type: 'string' },
      },
      required: ['id'],
    },
  },
  {
    name: 'task.delete',
    description: '删除任务',
    inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'] },
  },
  {
    name: 'file.list',
    description: '列出目录下文件',
    inputSchema: { type: 'object', properties: { dir: { type: 'string' } } },
  },
  {
    name: 'file.read',
    description: '读取文本文件',
    inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] },
  },
  {
    name: 'file.search',
    description: '在目录中搜索关键字',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string' },
        dir: { type: 'string' },
      },
      required: ['keyword'],
    },
  },
]

function safeParseJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export class AgentService {
  private readonly taskDB: TaskDB
  private readonly fileTools: FileTools

  constructor(taskDB: TaskDB, fileTools: FileTools) {
    this.taskDB = taskDB
    this.fileTools = fileTools
  }

  async runReAct(messages: ChatMessage[], planner: (prompt: string) => Promise<string>): Promise<ReActOutcome> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user')
    if (!lastUser) return { handled: false, reply: '' }

    const planPrompt = [
      '你是本地 Agent 调度器，请只在需要调用工具时输出 JSON。',
      '可用工具如下（name + schema）：',
      JSON.stringify(TOOL_SPECS, null, 2),
      '输出格式必须是：',
      '{"tool":"task.create","args":{"title":"..."}}',
      '若不需要调用工具，输出：NO_TOOL',
      `用户请求：${lastUser.content}`,
    ].join('\n\n')

    const plannerRaw = (await planner(planPrompt)).trim()
    if (plannerRaw === 'NO_TOOL') {
      return { handled: false, reply: '' }
    }

    const parsed = safeParseJSON(plannerRaw) as ToolCall | null
    if (!parsed || typeof parsed !== 'object' || typeof parsed.tool !== 'string' || typeof parsed.args !== 'object') {
      return { handled: false, reply: '' }
    }

    const result = this.executeTool(parsed.tool, parsed.args as Record<string, unknown>)

    return {
      handled: true,
      reply: '',
      toolName: parsed.tool,
      toolArgs: parsed.args as Record<string, unknown>,
      toolResult: result,
    }
  }

  private executeTool(tool: string, args: Record<string, unknown>) {
    if (tool === 'task.list') {
      return this.taskDB.listTasks().slice(0, 50)
    }

    if (tool === 'task.create') {
      const input: CreateTaskInput = {
        title: String(args.title ?? '').trim(),
        priority: (args.priority as CreateTaskInput['priority']) ?? 'medium',
        dueDate: (args.dueDate as string | null | undefined) ?? null,
        tags: (args.tags as string | undefined) ?? '',
        notes: (args.notes as string | undefined) ?? '',
      }
      if (!input.title) throw new Error('task.create 缺少 title')
      return this.taskDB.createTask(input)
    }

    if (tool === 'task.toggle') {
      const id = Number(args.id)
      if (!Number.isFinite(id)) throw new Error('task.toggle 缺少有效 id')
      return this.taskDB.toggleTask(id)
    }

    if (tool === 'task.update') {
      const id = Number(args.id)
      if (!Number.isFinite(id)) throw new Error('task.update 缺少有效 id')
      const input: UpdateTaskInput = {
        id,
        title: typeof args.title === 'string' ? args.title : undefined,
        priority: args.priority as UpdateTaskInput['priority'],
        dueDate: args.dueDate as string | null | undefined,
        tags: typeof args.tags === 'string' ? args.tags : undefined,
        notes: typeof args.notes === 'string' ? args.notes : undefined,
      }
      return this.taskDB.updateTask(input)
    }

    if (tool === 'task.delete') {
      const id = Number(args.id)
      if (!Number.isFinite(id)) throw new Error('task.delete 缺少有效 id')
      return { ok: this.taskDB.deleteTask(id) }
    }

    if (tool === 'file.list') {
      const dir = typeof args.dir === 'string' ? args.dir : '.'
      return this.fileTools.list(dir)
    }

    if (tool === 'file.read') {
      const relPath = String(args.path ?? '').trim()
      if (!relPath) throw new Error('file.read 缺少 path')
      return this.fileTools.read(relPath)
    }

    if (tool === 'file.search') {
      const keyword = String(args.keyword ?? '').trim()
      const dir = typeof args.dir === 'string' ? args.dir : '.'
      if (!keyword) throw new Error('file.search 缺少 keyword')
      return this.fileTools.search(keyword, dir)
    }

    throw new Error(`未知工具：${tool}`)
  }
}
