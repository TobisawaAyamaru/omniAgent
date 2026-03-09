import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

type JSONRPCID = number

type JSONRPCRequest = {
  jsonrpc: '2.0'
  id: JSONRPCID
  method: string
  params?: Record<string, unknown>
}

type JSONRPCSuccess = {
  jsonrpc: '2.0'
  id: JSONRPCID
  result: unknown
}

type JSONRPCError = {
  jsonrpc: '2.0'
  id: JSONRPCID
  error: {
    code: number
    message: string
    data?: unknown
  }
}

type JSONRPCNotification = {
  jsonrpc: '2.0'
  method: string
  params?: Record<string, unknown>
}

type JSONRPCIncoming = JSONRPCSuccess | JSONRPCError | JSONRPCNotification

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
  timer: NodeJS.Timeout
}

export type MCPTransport = 'stdio' | 'http' | 'sse'

type MCPServerEntry = {
  command?: string
  args?: string[]
  transport?: MCPTransport
  url?: string
  cwd?: string
  env?: Record<string, string>
  headers?: Record<string, string>
  enabled?: boolean
  name?: string
}

export type MCPServerConfig = {
  id: string
  name: string
  command?: string
  args?: string[]
  transport: MCPTransport
  url?: string
  cwd?: string
  env?: Record<string, string>
  headers?: Record<string, string>
  enabled: boolean
}

export type MCPTool = {
  serverId: string
  name: string
  description: string
  inputSchema: string
}

type MCPConfigFile = {
  mcpServers: Record<string, MCPServerEntry>
}

type StdioSession = {
  transport: 'stdio'
  process: ChildProcessWithoutNullStreams
  nextId: number
  buffer: Buffer
  pending: Map<number, PendingRequest>
  initialized: boolean
}

type HttpSession = {
  transport: 'http'
  url: string
  nextId: number
  initialized: boolean
}

type SSESession = {
  transport: 'sse'
  url: string
  postUrl: string
  nextId: number
  pending: Map<number, PendingRequest>
  initialized: boolean
  abortController: AbortController
  sessionId?: string
}

type MCPSession = StdioSession | HttpSession | SSESession

const REQUEST_TIMEOUT_MS = 15_000

export class MCPService {
  private readonly configPath: string
  private readonly sessions = new Map<string, MCPSession>()

  constructor(configPath: string) {
    this.configPath = configPath
    this.ensureConfigFile()
  }

  private ensureConfigFile() {
    const dir = path.dirname(this.configPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    if (!fs.existsSync(this.configPath)) {
      const seed: MCPConfigFile = {
        mcpServers: {
          'web-search': {
            command: 'npx',
            args: ['open-websearch@1.2.5'],
            transport: 'stdio',
            enabled: true,
          },
        },
      }
      fs.writeFileSync(this.configPath, JSON.stringify(seed, null, 2), 'utf-8')
    }
  }

  private readConfig(): MCPConfigFile {
    try {
      const raw = fs.readFileSync(this.configPath, 'utf-8')
      const parsed = JSON.parse(raw) as MCPConfigFile
      if (!parsed || !parsed.mcpServers || typeof parsed.mcpServers !== 'object') {
        return { mcpServers: {} }
      }
      return parsed
    } catch {
      return { mcpServers: {} }
    }
  }

  private normalizedServers(): MCPServerConfig[] {
    const cfg = this.readConfig()

    return Object.entries(cfg.mcpServers).map(([id, entry]) => ({
      id,
      name: entry.name ?? id,
      command: entry.command,
      args: entry.args ?? [],
      transport: entry.transport ?? 'stdio',
      url: entry.url,
      cwd: entry.cwd,
      env: entry.env,
      headers: entry.headers,
      enabled: entry.enabled !== false,
    }))
  }

  private getServerConfig(serverId: string): MCPServerConfig | undefined {
    return this.normalizedServers().find((s) => s.id === serverId)
  }

  private getServerHeaders(serverId: string): Record<string, string> {
    return this.getServerConfig(serverId)?.headers ?? {}
  }

  listServers() {
    return this.normalizedServers().map((s) => ({
      ...s,
      connected: this.sessions.has(s.id),
    }))
  }

  async connectServer(serverId: string) {
    const server = this.getServerConfig(serverId)
    if (!server) throw new Error('MCP server 不存在')
    if (!server.enabled) throw new Error('MCP server 未启用')
    if (this.sessions.has(serverId)) return { ok: true }

    if (server.transport === 'http') {
      if (!server.url) throw new Error('HTTP MCP server 缺少 url 配置')
      const session: HttpSession = { transport: 'http', url: server.url, nextId: 1, initialized: false }
      this.sessions.set(serverId, session)
      try {
        await this.initializeSession(serverId)
        session.initialized = true
        return { ok: true }
      } catch (error) {
        this.sessions.delete(serverId)
        throw error
      }
    }

    if (server.transport === 'sse') {
      if (!server.url) throw new Error('SSE MCP server 缺少 url 配置')
      const session: SSESession = {
        transport: 'sse',
        url: server.url,
        postUrl: this.normalizeSSEPostURL(server.url, '/messages'),
        nextId: 1,
        pending: new Map(),
        initialized: false,
        abortController: new AbortController(),
      }
      this.sessions.set(serverId, session)
      try {
        void this.startSSEStream(serverId)
        await this.initializeSession(serverId)
        session.initialized = true
        return { ok: true }
      } catch (error) {
        this.disconnectServer(serverId)
        throw error
      }
    }

    if (!server.command) throw new Error('stdio MCP server 缺少 command 配置')

    const child = spawn(server.command, server.args ?? [], {
      cwd: server.cwd || process.cwd(),
      env: { ...process.env, ...(server.env ?? {}) },
      stdio: 'pipe',
      windowsHide: true,
    })

    const session: StdioSession = {
      transport: 'stdio',
      process: child,
      nextId: 1,
      buffer: Buffer.alloc(0),
      pending: new Map(),
      initialized: false,
    }

    child.stdout.on('data', (chunk: Buffer) => this.onStdoutData(serverId, chunk))
    child.on('exit', (code, signal) => {
      this.rejectAllPending(serverId, `MCP 进程已退出（code=${code ?? 'null'}, signal=${signal ?? 'null'}）`)
      this.sessions.delete(serverId)
    })
    child.on('error', (err) => {
      this.rejectAllPending(serverId, `MCP 进程启动失败：${err.message}`)
      this.sessions.delete(serverId)
    })

    this.sessions.set(serverId, session)

    try {
      await this.initializeSession(serverId)
      session.initialized = true
      return { ok: true }
    } catch (error) {
      this.disconnectServer(serverId)
      throw error
    }
  }

  disconnectServer(serverId: string) {
    const session = this.sessions.get(serverId)
    if (session?.transport === 'stdio') {
      this.rejectAllPending(serverId, 'MCP server 已断开')
      session.process.kill()
    }
    if (session?.transport === 'sse') {
      this.rejectAllPending(serverId, 'MCP server 已断开')
      session.abortController.abort()
    }
    this.sessions.delete(serverId)
    return { ok: true }
  }

  async listTools(serverId?: string): Promise<MCPTool[]> {
    const targets = serverId
      ? [serverId]
      : Array.from(this.sessions.entries()).filter(([, s]) => s.initialized).map(([id]) => id)

    const out: MCPTool[] = []
    for (const sid of targets) {
      const session = this.sessions.get(sid)
      if (!session || !session.initialized) continue

      const result = (await this.request(sid, 'tools/list', {})) as {
        tools?: Array<{ name?: string; description?: string; inputSchema?: unknown }>
      }

      for (const tool of result.tools ?? []) {
        if (!tool?.name) continue
        out.push({
          serverId: sid,
          name: tool.name,
          description: tool.description ?? '',
          inputSchema: JSON.stringify(tool.inputSchema ?? { type: 'object', properties: {} }),
        })
      }
    }
    return out
  }

  async callTool(serverId: string, toolName: string, input: Record<string, unknown>) {
    const session = this.sessions.get(serverId)
    if (!session || !session.initialized) throw new Error('MCP server 未连接')

    const result = await this.request(serverId, 'tools/call', {
      name: toolName,
      arguments: input,
    })

    return { serverId, toolName, output: result as Record<string, unknown> }
  }

  private async initializeSession(serverId: string) {
    await this.request(serverId, 'initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'omniagent', version: '0.1.0' },
    })

    try {
      this.notify(serverId, 'notifications/initialized', {})
    } catch {
      // ignore
    }
  }

  private extractSessionIdFromString(value: string): string | undefined {
    try {
      const u = new URL(value)
      return u.searchParams.get('session_id') ?? u.searchParams.get('sessionId') ?? undefined
    } catch {
      // ignore
    }

    try {
      const parsed = JSON.parse(value) as Record<string, unknown>
      const sid = parsed.session_id ?? parsed.sessionId
      return typeof sid === 'string' && sid ? sid : undefined
    } catch {
      return undefined
    }
  }

  private withSessionId(urlString: string, sessionId?: string): string {
    if (!sessionId) return urlString
    try {
      const u = new URL(urlString)
      if (!u.searchParams.get('session_id')) u.searchParams.set('session_id', sessionId)
      return u.toString()
    } catch {
      return urlString
    }
  }

  private async startSSEStream(serverId: string) {
    const session = this.sessions.get(serverId)
    if (!session || session.transport !== 'sse') return

    const response = await fetch(session.url, {
      method: 'GET',
      headers: { accept: 'text/event-stream', ...this.getServerHeaders(serverId) },
      signal: session.abortController.signal,
    })

    if (!response.ok || !response.body) throw new Error(`SSE 连接失败（${response.status}）`)

    const h = response.headers.get('mcp-session-id') || response.headers.get('x-session-id')
    if (h) session.sessionId = h

    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      while (true) {
        const idx = buffer.indexOf('\n\n')
        if (idx < 0) break
        const rawEvent = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 2)
        this.handleSSEEvent(serverId, rawEvent)
      }
    }
  }

  private handleSSEEvent(serverId: string, rawEvent: string) {
    const session = this.sessions.get(serverId)
    if (!session || session.transport !== 'sse') return

    const lines = rawEvent.split(/\r?\n/)
    let eventName = 'message'
    const dataLines: string[] = []
    for (const line of lines) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim()
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim())
    }

    const data = dataLines.join('\n')
    if (!data) return

    if (eventName === 'endpoint') {
      session.postUrl = this.normalizeSSEPostURL(session.url, data)
      const sid = this.extractSessionIdFromString(data)
      if (sid) session.sessionId = sid
      return
    }

    const sid = this.extractSessionIdFromString(data)
    if (sid) session.sessionId = sid

    try {
      this.handleIncoming(serverId, JSON.parse(data) as JSONRPCIncoming)
    } catch {
      // ignore
    }
  }

  private normalizeSSEPostURL(baseSSEURL: string, endpointOrURL: string) {
    if (/^https?:\/\//i.test(endpointOrURL)) return endpointOrURL
    try {
      const base = new URL(baseSSEURL)
      const p = endpointOrURL.startsWith('/') ? endpointOrURL : `/${endpointOrURL}`
      return `${base.origin}${p}`
    } catch {
      return endpointOrURL
    }
  }

  private onStdoutData(serverId: string, chunk: Buffer) {
    const session = this.sessions.get(serverId)
    if (!session || session.transport !== 'stdio') return

    session.buffer = Buffer.concat([session.buffer, chunk])
    while (true) {
      const headerEnd = session.buffer.indexOf('\r\n\r\n')
      if (headerEnd === -1) return

      const headerPart = session.buffer.slice(0, headerEnd).toString('utf-8')
      const m = /Content-Length:\s*(\d+)/i.exec(headerPart)
      if (!m) {
        session.buffer = Buffer.alloc(0)
        return
      }

      const bodyLength = Number(m[1])
      const frameTotal = headerEnd + 4 + bodyLength
      if (session.buffer.length < frameTotal) return

      const body = session.buffer.slice(headerEnd + 4, frameTotal).toString('utf-8')
      session.buffer = session.buffer.slice(frameTotal)

      try {
        this.handleIncoming(serverId, JSON.parse(body) as JSONRPCIncoming)
      } catch {
        // ignore
      }
    }
  }

  private handleIncoming(serverId: string, message: JSONRPCIncoming) {
    if (!('id' in message)) return

    const session = this.sessions.get(serverId)
    if (!session || session.transport === 'http') return

    const pending = session.pending.get(message.id)
    if (!pending) return

    clearTimeout(pending.timer)
    session.pending.delete(message.id)

    if ('error' in message) pending.reject(new Error(message.error?.message || 'MCP 请求失败'))
    else pending.resolve(message.result)
  }

  private request(serverId: string, method: string, params: Record<string, unknown>) {
    const session = this.sessions.get(serverId)
    if (!session) throw new Error('MCP 会话不存在')

    if (session.transport === 'http') {
      const id = session.nextId++
      const payload: JSONRPCRequest = { jsonrpc: '2.0', id, method, params }
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

      return fetch(session.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json', ...this.getServerHeaders(serverId) },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(`HTTP MCP 请求失败（${res.status}）：${await res.text()}`)
          const incoming = (await res.json()) as JSONRPCSuccess | JSONRPCError
          if ('error' in incoming) throw new Error(incoming.error?.message || 'HTTP MCP 返回错误')
          return incoming.result
        })
        .finally(() => clearTimeout(timer))
    }

    if (session.transport === 'sse') {
      const id = session.nextId++
      const payload: JSONRPCRequest = { jsonrpc: '2.0', id, method, params }

      return new Promise<unknown>((resolve, reject) => {
        const timer = setTimeout(() => {
          session.pending.delete(id)
          reject(new Error(`MCP SSE 请求超时：${method}`))
        }, REQUEST_TIMEOUT_MS)

        session.pending.set(id, { resolve, reject, timer })

        fetch(this.withSessionId(session.postUrl, session.sessionId), {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'application/json, text/event-stream',
            ...(session.sessionId ? { 'mcp-session-id': session.sessionId, 'x-session-id': session.sessionId } : {}),
            ...this.getServerHeaders(serverId),
          },
          body: JSON.stringify(payload),
        })
          .then(async (res) => {
            if (!res.ok) {
              clearTimeout(timer)
              session.pending.delete(id)
              reject(new Error(`SSE MCP POST 失败（${res.status}）：${await res.text()}`))
            }
          })
          .catch((error) => {
            clearTimeout(timer)
            session.pending.delete(id)
            reject(error)
          })
      })
    }

    const id = session.nextId++
    const payload: JSONRPCRequest = { jsonrpc: '2.0', id, method, params }
    this.writeMessage(serverId, payload)

    return new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        session.pending.delete(id)
        reject(new Error(`MCP 请求超时：${method}`))
      }, REQUEST_TIMEOUT_MS)
      session.pending.set(id, { resolve, reject, timer })
    })
  }

  private notify(serverId: string, method: string, params: Record<string, unknown>) {
    const session = this.sessions.get(serverId)
    if (!session) throw new Error('MCP 会话不存在')

    if (session.transport === 'http') {
      void fetch(session.url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...this.getServerHeaders(serverId) },
        body: JSON.stringify({ jsonrpc: '2.0', method, params }),
      })
      return
    }

    if (session.transport === 'sse') {
      void fetch(this.withSessionId(session.postUrl, session.sessionId), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(session.sessionId ? { 'mcp-session-id': session.sessionId, 'x-session-id': session.sessionId } : {}),
          ...this.getServerHeaders(serverId),
        },
        body: JSON.stringify({ jsonrpc: '2.0', method, params }),
      })
      return
    }

    this.writeMessage(serverId, { jsonrpc: '2.0', method, params })
  }

  private writeMessage(serverId: string, payload: JSONRPCRequest | JSONRPCNotification) {
    const session = this.sessions.get(serverId)
    if (!session || session.transport !== 'stdio') throw new Error('stdio MCP 会话不存在')

    const body = Buffer.from(JSON.stringify(payload), 'utf-8')
    const header = Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, 'utf-8')
    session.process.stdin.write(Buffer.concat([header, body]))
  }

  private rejectAllPending(serverId: string, reason: string) {
    const session = this.sessions.get(serverId)
    if (!session || session.transport === 'http') return

    for (const [, pending] of session.pending) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
    }
    session.pending.clear()
  }
}
