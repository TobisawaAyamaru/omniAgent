import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react'
import { ChatPanel } from './components/panels/ChatPanel'
import { TasksPanel } from './components/panels/TasksPanel'
import { FilesPanel } from './components/panels/FilesPanel'
import { MCPPanel } from './components/panels/MCPPanel'
import { SettingsPanel } from './components/panels/SettingsPanel'
import { TAB_LABELS, type MCPHistoryItem, type WindowMode, type WorkspaceTab } from './components/constants'

function parseInputSchema(schemaText: string): Record<string, unknown> {
  try {
    return JSON.parse(schemaText) as Record<string, unknown>
  } catch {
    return { type: 'object', properties: {} }
  }
}

function buildTemplateBySchema(schemaText: string): string {
  const schema = parseInputSchema(schemaText)
  const properties = (schema.properties ?? {}) as Record<string, { type?: string }>
  const required = Array.isArray(schema.required) ? (schema.required as string[]) : []
  const template: Record<string, unknown> = {}

  for (const key of Object.keys(properties)) {
    const type = properties[key]?.type
    if (!required.includes(key)) continue
    if (type === 'string') template[key] = ''
    else if (type === 'number' || type === 'integer') template[key] = 0
    else if (type === 'boolean') template[key] = false
    else if (type === 'array') template[key] = []
    else if (type === 'object') template[key] = {}
    else template[key] = null
  }

  return JSON.stringify(template, null, 2)
}

function App() {
  const [mode, setMode] = useState<WindowMode>('mini')
  const [isPinned, setIsPinned] = useState(true)
  const [hotkey, setHotkey] = useState('Ctrl + Space')
  const [input, setInput] = useState('')
  const [tab, setTab] = useState<WorkspaceTab>('chat')

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')

  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskTags, setTaskTags] = useState('')
  const [taskLoading, setTaskLoading] = useState(false)
  const [taskError, setTaskError] = useState('')
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null)
  const [editingTitle, setEditingTitle] = useState('')

  const [configLoading, setConfigLoading] = useState(false)
  const [configMessage, setConfigMessage] = useState('')
  const [hasApiKey, setHasApiKey] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState('')
  const [defaultModel, setDefaultModel] = useState('claude-3-5-sonnet-latest')
  const [apiBaseUrl, setApiBaseUrl] = useState('https://api.anthropic.com')
  const [modelOptions, setModelOptions] = useState<string[]>([
    'claude-3-5-sonnet-latest',
    'claude-3-7-sonnet-latest',
    'claude-3-7-opus-latest',
  ])
  const [protocol, setProtocol] = useState<'anthropic' | 'openai'>('anthropic')
  const [customModelInput, setCustomModelInput] = useState('')


  const [mcpLoading, setMCPLoading] = useState(false)
  const [mcpError, setMCPError] = useState('')
  const [mcpMessage, setMCPMessage] = useState('')
  const [mcpServers, setMCPServers] = useState<MCPServer[]>([])
  const [mcpTools, setMCPTools] = useState<MCPTool[]>([])
  const [selectedServerId, setSelectedServerId] = useState('')
  const [selectedToolName, setSelectedToolName] = useState('')
  const [toolInputJSON, setToolInputJSON] = useState('{}')
  const [toolJSONError, setToolJSONError] = useState('')
  const [mcpHistory, setMCPHistory] = useState<MCPHistoryItem[]>([])

  const chatInputRef = useRef<HTMLInputElement>(null)

  const selectedTool = useMemo(
    () => mcpTools.find((tool) => tool.serverId === selectedServerId && tool.name === selectedToolName),
    [mcpTools, selectedServerId, selectedToolName],
  )

  useEffect(() => {
    void (async () => {
      const state = await window.omni.getUIState()
      setMode(state.isMiniMode ? 'mini' : 'expanded')
      setIsPinned(state.isPinned)
      setHotkey(state.hotkey.replace('CommandOrControl', 'Cmd/Ctrl'))
    })()
  }, [])

  useEffect(() => {
    if (tab === 'tasks' && mode === 'expanded') void loadTasks()
    if (tab === 'settings' && mode === 'expanded') void loadConfig()
    if (tab === 'mcp' && mode === 'expanded') void loadMCPServers()
  }, [tab, mode])

  useEffect(() => {
    if (!selectedTool) return
    setToolInputJSON(buildTemplateBySchema(selectedTool.inputSchema))
    setToolJSONError('')
  }, [selectedTool])

  const placeholder = useMemo(
    () => (mode === 'mini' ? '问我任何事，或输入命令…' : '例如：帮我创建一个今天下午 3 点的提醒，标题“项目评审”'),
    [mode],
  )

  const toggleMode = async () => {
    const nextIsMini = mode !== 'mini'
    await window.omni.setMiniMode(nextIsMini)
    setMode(nextIsMini ? 'mini' : 'expanded')
  }

  const togglePin = async () => {
    const res = await window.omni.togglePin()
    setIsPinned(res.isPinned)
  }

  const loadTasks = async () => {
    setTaskLoading(true)
    setTaskError('')
    try {
      setTasks(await window.omni.listTasks())
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : '加载任务失败')
    } finally {
      setTaskLoading(false)
    }
  }

  const createTask = async () => {
    if (!taskTitle.trim()) {
      setTaskError('请输入任务标题')
      return
    }

    setTaskLoading(true)
    setTaskError('')
    try {
      await window.omni.createTask({
        title: taskTitle.trim(),
        priority: taskPriority,
        dueDate: taskDueDate.trim() || null,
        tags: taskTags.trim(),
      })
      setTaskTitle('')
      setTaskPriority('medium')
      setTaskDueDate('')
      setTaskTags('')
      await loadTasks()
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : '创建任务失败')
    } finally {
      setTaskLoading(false)
    }
  }

  const toggleTask = async (id: number) => {
    try {
      const updated = await window.omni.toggleTask(id)
      if (updated) setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : '更新任务失败')
    }
  }

  const deleteTask = async (id: number) => {
    try {
      const res = await window.omni.deleteTask(id)
      if (res.ok) setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : '删除任务失败')
    }
  }

  const startEditTask = (task: TaskItem) => {
    setEditingTaskId(task.id)
    setEditingTitle(task.title)
  }

  const cancelEditTask = () => {
    setEditingTaskId(null)
    setEditingTitle('')
  }

  const saveEditTask = async (id: number) => {
    if (!editingTitle.trim()) {
      setTaskError('任务标题不能为空')
      return
    }

    try {
      const updated = await window.omni.updateTask({ id, title: editingTitle.trim() })
      if (!updated) {
        setTaskError('任务不存在或更新失败')
        return
      }
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
      cancelEditTask()
    } catch (error) {
      setTaskError(error instanceof Error ? error.message : '编辑任务失败')
    }
  }

  const loadConfig = async () => {
    setConfigLoading(true)
    setConfigMessage('')
    try {
      const cfg = await window.omni.getConfig()
      setHasApiKey(cfg.hasAnthropicApiKey)
      setDefaultModel(cfg.defaultModel)
      setApiBaseUrl(cfg.apiBaseUrl)
      setModelOptions(cfg.modelOptions)
      setProtocol(cfg.protocol)
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : '加载配置失败')
    } finally {
      setConfigLoading(false)
    }
  }

  const saveApiKey = async () => {
    if (!apiKeyInput.trim()) {
      setConfigMessage('请输入 API Key')
      return
    }

    setConfigLoading(true)
    setConfigMessage('')
    try {
      await window.omni.setApiKey(apiKeyInput.trim())
      setApiKeyInput('')
      setHasApiKey(true)
      setConfigMessage('API Key 已保存')
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : '保存 API Key 失败')
    } finally {
      setConfigLoading(false)
    }
  }

  const clearApiKey = async () => {
    setConfigLoading(true)
    setConfigMessage('')
    try {
      await window.omni.clearApiKey()
      setHasApiKey(false)
      setConfigMessage('API Key 已清除')
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : '清除 API Key 失败')
    } finally {
      setConfigLoading(false)
    }
  }

  const saveDefaultModel = async () => {
    if (!defaultModel.trim()) {
      setConfigMessage('请输入模型名称')
      return
    }

    setConfigLoading(true)
    setConfigMessage('')
    try {
      await window.omni.setDefaultModel(defaultModel.trim())
      setConfigMessage('默认模型已更新')
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : '更新模型失败')
    } finally {
      setConfigLoading(false)
    }
  }

  const saveApiBaseUrl = async () => {
    if (!apiBaseUrl.trim()) {
      setConfigMessage('请输入链接')
      return
    }

    setConfigLoading(true)
    setConfigMessage('')
    try {
      await window.omni.setApiBaseUrl(apiBaseUrl.trim())
      setConfigMessage('API 链接已更新')
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : '更新链接失败')
    } finally {
      setConfigLoading(false)
    }
  }

  const addCustomModel = async () => {
    const model = customModelInput.trim()
    if (!model) {
      setConfigMessage('请输入自定义模型名')
      return
    }

    const next = Array.from(new Set([...modelOptions, model]))
    setConfigLoading(true)
    setConfigMessage('')
    try {
      await window.omni.setModelOptions(next)
      setModelOptions(next)
      setDefaultModel(model)
      setCustomModelInput('')
      setConfigMessage('自定义模型已添加')
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : '添加模型失败')
    } finally {
      setConfigLoading(false)
    }
  }

  const saveAllConfig = async () => {
    if (!apiKeyInput.trim()) {
      setConfigMessage('请输入 API Key')
      return
    }
    if (!defaultModel.trim()) {
      setConfigMessage('请输入模型名称')
      return
    }
    if (!apiBaseUrl.trim()) {
      setConfigMessage('请输入链接')
      return
    }

    const nextModels = Array.from(new Set([...modelOptions, defaultModel.trim()]))

    setConfigLoading(true)
    setConfigMessage('')
    try {
      await window.omni.setApiKey(apiKeyInput.trim())
      await window.omni.setProtocol(protocol)
      await window.omni.setModelOptions(nextModels)
      await window.omni.setDefaultModel(defaultModel.trim())
      await window.omni.setApiBaseUrl(apiBaseUrl.trim())
      setModelOptions(nextModels)
      setHasApiKey(true)
      setConfigMessage('模型配置已保存')
    } catch (error) {
      setConfigMessage(error instanceof Error ? error.message : '保存配置失败')
    } finally {
      setConfigLoading(false)
    }
  }

  const sendChat = async () => {
    if (chatLoading) return
    if (!input.trim()) {
      setChatError('请输入消息内容')
      return
    }

    const next = [...chatMessages, { role: 'user', content: input.trim() as string }]
    setChatMessages(next)
    setInput('')
    setChatLoading(true)
    setChatError('')

    try {
      const res = await window.omni.sendChat(next)
      setChatMessages((prev) => [...prev, { role: 'assistant', content: res.reply }])
    } catch (error) {
      setChatError(error instanceof Error ? error.message : '发送失败')
    } finally {
      setChatLoading(false)
      chatInputRef.current?.focus()
    }
  }

  const loadMCPServers = async () => {
    setMCPLoading(true)

    setMCPError('')
    try {
      const servers = await window.omni.listMCPServers()
      setMCPServers(servers)
      const connected = servers.find((s) => s.connected)
      const fallback = connected?.id ?? servers[0]?.id ?? ''
      setSelectedServerId((prev) => prev || fallback)
    } catch (error) {
      setMCPError(error instanceof Error ? error.message : '加载 MCP Servers 失败')
    } finally {
      setMCPLoading(false)
    }
  }

  const connectMCP = async (serverId: string) => {
    setMCPLoading(true)
    setMCPError('')
    setMCPMessage('')
    try {
      await window.omni.connectMCPServer(serverId)
      await loadMCPServers()
      const tools = await window.omni.listMCPTools(serverId)
      setMCPTools(tools)
      setSelectedServerId(serverId)
      setSelectedToolName(tools[0]?.name ?? '')
      setMCPMessage('连接成功，工具列表已刷新')
    } catch (error) {
      setMCPError(error instanceof Error ? error.message : '连接 MCP Server 失败')
    } finally {
      setMCPLoading(false)
    }
  }

  const disconnectMCP = async (serverId: string) => {
    setMCPLoading(true)
    setMCPError('')
    setMCPMessage('')
    try {
      await window.omni.disconnectMCPServer(serverId)
      await loadMCPServers()
      setMCPTools([])
      setSelectedToolName('')
      setMCPMessage('已断开连接')
    } catch (error) {
      setMCPError(error instanceof Error ? error.message : '断开 MCP Server 失败')
    } finally {
      setMCPLoading(false)
    }
  }

  const refreshMCPTools = async () => {
    if (!selectedServerId) {
      setMCPError('请先选择并连接一个 Server')
      return
    }

    setMCPLoading(true)
    setMCPError('')
    try {
      const tools = await window.omni.listMCPTools(selectedServerId)
      setMCPTools(tools)
      if (!tools.some((t) => t.name === selectedToolName)) setSelectedToolName(tools[0]?.name ?? '')
    } catch (error) {
      setMCPError(error instanceof Error ? error.message : '获取工具列表失败')
    } finally {
      setMCPLoading(false)
    }
  }

  const parseToolInput = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(toolInputJSON)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setToolJSONError('输入必须是 JSON 对象，例如 {"text":"hello"}')
        return null
      }
      setToolJSONError('')
      return parsed as Record<string, unknown>
    } catch {
      setToolJSONError('JSON 格式错误，请检查逗号和引号')
      return null
    }
  }

  const callSelectedTool = async () => {
    if (!selectedServerId) return setMCPError('请先选择并连接一个 Server')
    if (!selectedToolName) return setMCPError('请先选择工具')

    const parsedInput = parseToolInput()
    if (!parsedInput) return

    setMCPLoading(true)
    setMCPError('')
    setMCPMessage('')

    const historyId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setMCPHistory((prev) => [
      { id: historyId, timestamp: new Date().toISOString(), serverId: selectedServerId, toolName: selectedToolName, input: parsedInput },
      ...prev,
    ])

    try {
      const res = await window.omni.callMCPTool({ serverId: selectedServerId, toolName: selectedToolName, input: parsedInput })
      setMCPHistory((prev) => prev.map((i) => (i.id === historyId ? { ...i, output: res.output } : i)))
      setMCPMessage(`${res.toolName} 调用成功`)
    } catch (error) {
      const msg = error instanceof Error ? error.message : '调用工具失败'
      setMCPHistory((prev) => prev.map((i) => (i.id === historyId ? { ...i, error: msg } : i)))
      setMCPError(msg)
    } finally {
      setMCPLoading(false)
    }
  }

  const replayHistory = (item: MCPHistoryItem) => {
    setSelectedServerId(item.serverId)
    setSelectedToolName(item.toolName)
    setToolInputJSON(JSON.stringify(item.input, null, 2))
    setToolJSONError('')
  }

  const copyHistory = async (item: MCPHistoryItem) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(item, null, 2))
      setMCPMessage('历史记录已复制到剪贴板')
    } catch {
      setMCPError('复制失败，请检查系统剪贴板权限')
    }
  }

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (tab === 'chat') {
      e.preventDefault()
      void sendChat()
      return
    }
    if (tab === 'tasks') {
      e.preventDefault()
      void createTask()
    }
  }

  const rootClass =
    mode === 'mini'
      ? 'relative m-2 h-[calc(100%-16px)] overflow-hidden rounded-2xl border border-white/20 bg-slate-900/85 text-slate-100 shadow-[0_20px_70px_rgba(3,7,18,0.6)] backdrop-blur-2xl'
      : 'relative m-3 h-[calc(100%-24px)] overflow-hidden rounded-[22px] border border-white/20 bg-slate-900/85 text-slate-100 shadow-[0_30px_90px_rgba(3,7,18,0.72)] backdrop-blur-2xl'

  const noDragStyle: CSSProperties = { WebkitAppRegion: 'no-drag' }

  return (
    <main className={rootClass}>
      <div className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-fuchsia-500/15 blur-3xl" />

      <header
        className="relative z-10 flex h-12 items-center justify-between border-b border-white/10 bg-gradient-to-r from-slate-900/60 via-sky-900/40 to-violet-900/35 px-4"
        style={{ WebkitAppRegion: 'drag' } as CSSProperties}
      >
        <div className="flex items-center gap-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(56,189,248,0.95)]" />
          <h1 className="m-0 text-sm font-extrabold tracking-wide">OmniAgent</h1>
          <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-200/90">本地优先 · MCP兼容</span>
        </div>
        <div className="flex gap-2" style={noDragStyle}>
          <button onClick={toggleMode} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/25">{mode === 'mini' ? '展开' : '迷你'}</button>
          <button onClick={togglePin} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:-translate-y-0.5 hover:bg-cyan-400/25">{isPinned ? '取消置顶' : '置顶'}</button>
        </div>
      </header>

      <section className="relative z-10 p-3" style={noDragStyle}>
        <input
          ref={chatInputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="h-10 w-full rounded-xl border border-white/15 bg-slate-950/65 px-3 text-sm text-slate-100 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
        />
      </section>

      {mode === 'expanded' && (
        <>
          <nav className="relative z-10 flex gap-2 px-3 pb-3" style={noDragStyle}>
            {(Object.keys(TAB_LABELS) as WorkspaceTab[]).map((k) => (
              <button
                key={k}
                className={`h-8 rounded-lg border px-3 text-xs transition ${tab === k ? 'border-cyan-300/60 bg-cyan-400/25 text-white' : 'border-white/20 bg-white/10 text-slate-100 hover:bg-cyan-400/20'}`}
                onClick={() => setTab(k)}
              >
                {TAB_LABELS[k]}
              </button>
            ))}
          </nav>

          <section className="relative z-10 h-[calc(100%-102px)] overflow-hidden px-3 pb-3">
            {tab === 'chat' && <ChatPanel chatMessages={chatMessages} chatLoading={chatLoading} chatError={chatError} hotkey={hotkey} onSend={() => { void sendChat() }} />}
            {tab === 'tasks' && (
              <TasksPanel
                tasks={tasks}
                taskTitle={taskTitle}
                taskPriority={taskPriority}
                taskDueDate={taskDueDate}
                taskTags={taskTags}
                taskLoading={taskLoading}
                taskError={taskError}
                editingTaskId={editingTaskId}
                editingTitle={editingTitle}
                setTaskTitle={setTaskTitle}
                setTaskPriority={setTaskPriority}
                setTaskDueDate={setTaskDueDate}
                setTaskTags={setTaskTags}
                setEditingTitle={setEditingTitle}
                onCreateTask={() => { void createTask() }}
                onLoadTasks={() => { void loadTasks() }}
                onToggleTask={(id) => { void toggleTask(id) }}
                onStartEditTask={startEditTask}
                onCancelEditTask={cancelEditTask}
                onSaveEditTask={(id) => { void saveEditTask(id) }}
                onDeleteTask={(id) => { void deleteTask(id) }}
              />
            )}
            {tab === 'files' && <FilesPanel />}
            {tab === 'mcp' && (
              <MCPPanel
                mcpLoading={mcpLoading}
                mcpError={mcpError}
                mcpMessage={mcpMessage}
                mcpServers={mcpServers}
                mcpTools={mcpTools}
                selectedServerId={selectedServerId}
                selectedToolName={selectedToolName}
                selectedTool={selectedTool}
                toolInputJSON={toolInputJSON}
                toolJSONError={toolJSONError}
                mcpHistory={mcpHistory}
                setSelectedServerId={setSelectedServerId}
                setSelectedToolName={setSelectedToolName}
                setToolInputJSON={setToolInputJSON}
                onLoadMCPServers={() => { void loadMCPServers() }}
                onConnectMCP={(id) => { void connectMCP(id) }}
                onDisconnectMCP={(id) => { void disconnectMCP(id) }}
                onRefreshMCPTools={() => { void refreshMCPTools() }}
                onGenerateTemplate={() => {
                  if (selectedTool) {
                    setToolInputJSON(buildTemplateBySchema(selectedTool.inputSchema))
                    setToolJSONError('')
                  }
                }}
                onCallSelectedTool={() => { void callSelectedTool() }}
                onReplayHistory={replayHistory}
                onCopyHistory={(item) => { void copyHistory(item) }}
              />
            )}
            {tab === 'settings' && (
              <SettingsPanel
                hasApiKey={hasApiKey}
                apiKeyInput={apiKeyInput}
                defaultModel={defaultModel}
                apiBaseUrl={apiBaseUrl}
                modelOptions={modelOptions}
                protocol={protocol}
                customModelInput={customModelInput}
                configLoading={configLoading}
                configMessage={configMessage}
                setApiKeyInput={setApiKeyInput}
                setDefaultModel={setDefaultModel}
                setApiBaseUrl={setApiBaseUrl}
                setProtocol={setProtocol}
                setCustomModelInput={setCustomModelInput}
                onSaveAllConfig={() => { void saveAllConfig() }}
                onClearApiKey={() => { void clearApiKey() }}
                onAddCustomModel={() => { void addCustomModel() }}
                onLoadConfig={() => { void loadConfig() }}
              />
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default App
