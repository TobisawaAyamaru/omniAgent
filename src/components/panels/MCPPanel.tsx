import type { MCPHistoryItem } from '../constants'

type MCPPanelProps = {
  mcpLoading: boolean
  mcpError: string
  mcpMessage: string
  mcpServers: MCPServer[]
  mcpTools: MCPTool[]
  selectedServerId: string
  selectedToolName: string
  selectedTool?: MCPTool
  toolInputJSON: string
  toolJSONError: string
  mcpHistory: MCPHistoryItem[]
  setSelectedServerId: (v: string) => void
  setSelectedToolName: (v: string) => void
  setToolInputJSON: (v: string) => void
  onLoadMCPServers: () => void
  onConnectMCP: (serverId: string) => void
  onDisconnectMCP: (serverId: string) => void
  onRefreshMCPTools: () => void
  onGenerateTemplate: () => void
  onCallSelectedTool: () => void
  onReplayHistory: (item: MCPHistoryItem) => void
  onCopyHistory: (item: MCPHistoryItem) => void
}

export function MCPPanel(props: MCPPanelProps) {
  const {
    mcpLoading,
    mcpError,
    mcpMessage,
    mcpServers,
    mcpTools,
    selectedServerId,
    selectedToolName,
    selectedTool,
    toolInputJSON,
    toolJSONError,
    mcpHistory,
    setSelectedServerId,
    setSelectedToolName,
    setToolInputJSON,
    onLoadMCPServers,
    onConnectMCP,
    onDisconnectMCP,
    onRefreshMCPTools,
    onGenerateTemplate,
    onCallSelectedTool,
    onReplayHistory,
    onCopyHistory,
  } = props

  return (
    <div className="grid grid-cols-[1fr_1.1fr] gap-3">
      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">MCP Servers</h2>
          <button onClick={onLoadMCPServers} disabled={mcpLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">刷新</button>
        </div>
        {mcpError && <p className="mb-2 rounded-md border border-rose-300/30 bg-rose-400/10 px-2 py-1 text-xs text-rose-200">{mcpError}</p>}
        <div className="grid gap-2">
          {mcpServers.length === 0 && <p className="text-xs text-slate-300/80">暂无 Server（将读取 mcp-config.json）</p>}
          {mcpServers.map((server) => (
            <div key={server.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div>
                <strong className="text-sm text-slate-100">{server.name}</strong>
                <p className="text-xs text-slate-300/80">{server.command} {(server.args ?? []).join(' ')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${server.connected ? 'border-emerald-300/40 text-emerald-300' : 'border-white/20 text-slate-300'}`}>
                  {server.connected ? '已连接' : '未连接'}
                </span>
                {server.connected ? (
                  <button onClick={() => onDisconnectMCP(server.id)} disabled={mcpLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-rose-400/25 disabled:cursor-not-allowed disabled:opacity-50">断开</button>
                ) : (
                  <button onClick={() => onConnectMCP(server.id)} disabled={mcpLoading || !server.enabled} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">连接</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </article>

      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">Tool 调用器</h2>
          <button onClick={onRefreshMCPTools} disabled={mcpLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">刷新工具</button>
        </div>

        <div className="mb-2 grid grid-cols-2 gap-2">
          <input className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30" value={selectedServerId} onChange={(e) => setSelectedServerId(e.target.value)} placeholder="server id" />
          <select className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30" value={selectedToolName} onChange={(e) => setSelectedToolName(e.target.value)}>
            <option value="">选择工具</option>
            {mcpTools.filter((tool) => tool.serverId === selectedServerId).map((tool) => (
              <option key={`${tool.serverId}-${tool.name}`} value={tool.name}>{tool.name}</option>
            ))}
          </select>
        </div>

        {selectedTool && (
          <div className="mb-2">
            <p className="text-xs text-slate-200">{selectedTool.description}</p>
            <p className="text-xs text-slate-300/80">Schema: {selectedTool.inputSchema}</p>
          </div>
        )}

        <textarea className="min-h-40 w-full resize-y rounded-lg border border-white/15 bg-slate-950/75 p-2.5 font-mono text-xs text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30" value={toolInputJSON} onChange={(e) => setToolInputJSON(e.target.value)} placeholder={'输入 JSON，例如 {"text":"hello"}'} />
        {toolJSONError && <p className="mt-2 rounded-md border border-rose-300/30 bg-rose-400/10 px-2 py-1 text-xs text-rose-200">{toolJSONError}</p>}

        <div className="mt-2 grid grid-cols-2 gap-2">
          <button onClick={onGenerateTemplate} disabled={!selectedTool} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">生成模板</button>
          <button onClick={onCallSelectedTool} disabled={mcpLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">执行调用</button>
        </div>

        {mcpMessage && <p className="mt-2 text-xs text-slate-300/85">{mcpMessage}</p>}
      </article>

      <article className="col-span-2 rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">调用历史</h2>
          <span className="text-xs text-slate-300/80">共 {mcpHistory.length} 条</span>
        </div>

        <div className="grid gap-2">
          {mcpHistory.length === 0 && <p className="text-xs text-slate-300/80">暂无调用历史</p>}
          {mcpHistory.map((item) => (
            <div key={item.id} className="grid gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
              <div className="flex items-center gap-2">
                <strong className="text-sm text-slate-100">{item.toolName}</strong>
                <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">{item.serverId}</span>
                <span className="text-xs text-slate-300/80">{new Date(item.timestamp).toLocaleTimeString()}</span>
              </div>
              <pre className="m-0 overflow-auto rounded-lg border border-white/10 bg-slate-950/80 p-2 font-mono text-xs text-slate-200">{JSON.stringify(item.input, null, 2)}</pre>
              <pre className="m-0 overflow-auto rounded-lg border border-white/10 bg-slate-950/80 p-2 font-mono text-xs text-slate-200">{JSON.stringify(item.output ?? { error: item.error ?? 'pending' }, null, 2)}</pre>
              <div className="flex items-center gap-2">
                <button onClick={() => onReplayHistory(item)} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">重放</button>
                <button onClick={() => onCopyHistory(item)} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">复制</button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}
