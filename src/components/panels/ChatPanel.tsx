type ChatPanelProps = {
  chatMessages: ChatMessage[]
  chatLoading: boolean
  chatError: string
  hotkey: string
  onSend: () => void
}

export function ChatPanel({ chatMessages, chatLoading, chatError, hotkey, onSend }: ChatPanelProps) {
  return (
    <div className="grid gap-3">
      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">AI 对话（Claude）</h2>
          <button
            onClick={onSend}
            disabled={chatLoading}
            className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            发送
          </button>
        </div>

        {chatError && (
          <p className="mb-3 rounded-md border border-rose-300/30 bg-rose-400/10 px-2 py-1 text-xs text-rose-200">
            {chatError}
          </p>
        )}

        <div className="grid max-h-[360px] gap-2 overflow-auto pr-1">
          {chatMessages.length === 0 && <p className="text-xs text-slate-300/80">还没有消息，输入后点击发送。</p>}
          {chatMessages.map((msg, idx) => (
            <div
              key={`${msg.role}-${idx}`}
              className={`rounded-xl border px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                  : 'border-violet-300/25 bg-violet-400/10 text-violet-100'
              }`}
            >
              <strong className="mr-1">{msg.role === 'user' ? '你' : 'Claude'}：</strong>
              <span>{msg.content}</span>
            </div>
          ))}
          {chatLoading && <p className="text-xs text-slate-300/80">Claude 正在思考...</p>}
        </div>
      </article>

      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <h2 className="mb-1 text-sm font-semibold text-slate-100">全局热键</h2>
        <p className="text-xs text-slate-300/85">{hotkey} 唤起 / 收起悬浮窗</p>
      </article>
    </div>
  )
}
