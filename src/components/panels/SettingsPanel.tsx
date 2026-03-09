type SettingsPanelProps = {
  hasApiKey: boolean
  apiKeyInput: string
  defaultModel: string
  apiBaseUrl: string
  modelOptions: string[]
  protocol: 'anthropic' | 'openai'
  customModelInput: string
  configLoading: boolean
  configMessage: string
  setApiKeyInput: (v: string) => void
  setDefaultModel: (v: string) => void
  setApiBaseUrl: (v: string) => void
  setProtocol: (v: 'anthropic' | 'openai') => void
  setCustomModelInput: (v: string) => void
  onSaveAllConfig: () => void
  onClearApiKey: () => void
  onAddCustomModel: () => void
  onLoadConfig: () => void
}

export function SettingsPanel(props: SettingsPanelProps) {
  const {
    hasApiKey,
    apiKeyInput,
    defaultModel,
    apiBaseUrl,
    modelOptions,
    protocol,
    customModelInput,
    configLoading,
    configMessage,
    setApiKeyInput,
    setDefaultModel,
    setApiBaseUrl,
    setProtocol,
    setCustomModelInput,
    onSaveAllConfig,
    onClearApiKey,
    onAddCustomModel,
    onLoadConfig,
  } = props

  return (
    <div className="grid gap-3">
      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">模型配置</h2>
        <p className="mb-3 text-xs text-slate-300/85">状态：{hasApiKey ? '已配置 API Key' : '未配置 API Key'}</p>

        <div className="grid gap-2">
          <label className="text-xs text-slate-300/85">API Key</label>
          <div className="grid grid-cols-[1fr_100px] items-center gap-2">
            <input
              className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="输入 Anthropic API Key"
            />
            <button onClick={onClearApiKey} disabled={configLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-rose-400/25 disabled:cursor-not-allowed disabled:opacity-50">清除</button>
          </div>

          <label className="mt-1 text-xs text-slate-300/85">模型（默认内置 Claude）</label>
          <select
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={defaultModel}
            onChange={(e) => setDefaultModel(e.target.value)}
          >
            {modelOptions.map((model) => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>

          <div className="grid grid-cols-[1fr_100px] items-center gap-2">
            <input
              className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
              value={customModelInput}
              onChange={(e) => setCustomModelInput(e.target.value)}
              placeholder="添加自定义模型，如 claude-3-5-sonnet-latest"
            />
            <button onClick={onAddCustomModel} disabled={configLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">添加</button>
          </div>

          <label className="mt-1 text-xs text-slate-300/85">协议</label>
          <select
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={protocol}
            onChange={(e) => setProtocol(e.target.value as 'anthropic' | 'openai')}
          >
            <option value="anthropic">Anthropic Messages</option>
            <option value="openai">OpenAI Chat Completions</option>
          </select>

          <label className="mt-1 text-xs text-slate-300/85">API Base URL</label>
          <input
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={apiBaseUrl}
            onChange={(e) => setApiBaseUrl(e.target.value)}
            placeholder="例如：https://api.anthropic.com"
          />

          <div className="mt-2 flex items-center gap-2">
            <button onClick={onSaveAllConfig} disabled={configLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">保存全部</button>
            <button onClick={onLoadConfig} disabled={configLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">刷新配置</button>
          </div>
        </div>

        {configMessage && <p className="mt-2 text-xs text-slate-300/85">{configMessage}</p>}
      </article>
    </div>
  )
}
