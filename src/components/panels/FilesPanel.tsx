import { useEffect, useState } from 'react'

export function FilesPanel() {
  const [fileDir, setFileDir] = useState('.')
  const [fileKeyword, setFileKeyword] = useState('')
  const [selectedFilePath, setSelectedFilePath] = useState('')
  const [rootInput, setRootInput] = useState('')
  const [roots, setRoots] = useState<string[]>([])
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState('')
  const [fileListResult, setFileListResult] = useState<FileListResult | null>(null)
  const [fileReadResult, setFileReadResult] = useState<FileReadResult | null>(null)
  const [fileSearchResult, setFileSearchResult] = useState<FileSearchResult | null>(null)

  useEffect(() => {
    void loadRoots()
  }, [])

  const loadRoots = async () => {
    setFileLoading(true)
    setFileError('')
    try {
      const res = await window.omni.fileGetRoots()
      setRoots(res.roots)
      if (res.roots.length > 0 && fileDir === '.') {
        setFileDir(res.roots[0])
      }
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '加载可访问目录失败')
    } finally {
      setFileLoading(false)
    }
  }

  const addRoot = async () => {
    const root = rootInput.trim()
    if (!root) {
      setFileError('请输入要添加的目录路径')
      return
    }

    setFileLoading(true)
    setFileError('')
    try {
      const res = await window.omni.fileAddRoot(root)
      setRoots(res.roots)
      setFileDir(root)
      setRootInput('')
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '添加目录失败')
    } finally {
      setFileLoading(false)
    }
  }

  const removeRoot = async (root: string) => {
    setFileLoading(true)
    setFileError('')
    try {
      const res = await window.omni.fileRemoveRoot(root)
      setRoots(res.roots)
      if (fileDir === root) {
        setFileDir(res.roots[0] ?? '.')
      }
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '移除目录失败')
    } finally {
      setFileLoading(false)
    }
  }

  const listFiles = async () => {
    setFileLoading(true)
    setFileError('')
    try {
      const res = await window.omni.fileList(fileDir.trim() || '.')
      setFileListResult(res)
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '列出文件失败')
    } finally {
      setFileLoading(false)
    }
  }

  const readFile = async () => {
    if (!selectedFilePath.trim()) {
      setFileError('请输入文件路径')
      return
    }

    setFileLoading(true)
    setFileError('')
    try {
      const res = await window.omni.fileRead(selectedFilePath.trim())
      setFileReadResult(res)
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '读取文件失败')
    } finally {
      setFileLoading(false)
    }
  }

  const searchFiles = async () => {
    if (!fileKeyword.trim()) {
      setFileError('请输入搜索关键字')
      return
    }

    setFileLoading(true)
    setFileError('')
    try {
      const res = await window.omni.fileSearch({ keyword: fileKeyword.trim(), dir: fileDir.trim() || '.' })
      setFileSearchResult(res)
    } catch (error) {
      setFileError(error instanceof Error ? error.message : '搜索失败')
    } finally {
      setFileLoading(false)
    }
  }

  const pickEntry = (entry: { name: string; type: 'dir' | 'file' }) => {
    const base = (fileListResult?.dir ?? '.').replace(/\\/g, '/')
    const next = base === '.' ? entry.name : `${base}/${entry.name}`

    if (entry.type === 'dir') {
      setFileDir(next)
      setSelectedFilePath('')
      void listFiles()
      return
    }

    setSelectedFilePath(next)
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">可访问目录</h2>
          <button onClick={() => void loadRoots()} disabled={fileLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">刷新</button>
        </div>

        <div className="mb-2 grid grid-cols-[1fr_90px] gap-2">
          <input
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={rootInput}
            onChange={(e) => setRootInput(e.target.value)}
            placeholder="添加绝对路径，例如 E:\\workspace"
          />
          <button onClick={() => void addRoot()} disabled={fileLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">添加</button>
        </div>

        <div className="mb-3 grid max-h-40 gap-1 overflow-auto rounded-lg border border-white/10 bg-slate-950/40 p-2">
          {roots.map((root) => (
            <div key={root} className="flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs text-slate-200 hover:bg-white/10">
              <button onClick={() => setFileDir(root)} className="truncate text-left">{root}</button>
              <button onClick={() => void removeRoot(root)} className="text-rose-300">移除</button>
            </div>
          ))}
          {roots.length === 0 && <p className="text-xs text-slate-300/75">暂无目录，先添加一个。</p>}
        </div>

        <h2 className="mb-2 text-sm font-semibold text-slate-100">文件浏览</h2>
        <div className="mb-2 grid grid-cols-[1fr_90px] gap-2">
          <input
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={fileDir}
            onChange={(e) => setFileDir(e.target.value)}
            placeholder="目录，可填绝对路径或相对路径"
          />
          <button onClick={() => void listFiles()} disabled={fileLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">列出</button>
        </div>

        <div className="grid max-h-64 gap-1 overflow-auto rounded-lg border border-white/10 bg-slate-950/40 p-2">
          {(fileListResult?.entries ?? []).map((entry) => (
            <button
              key={`${entry.type}-${entry.name}`}
              onClick={() => pickEntry(entry)}
              className="flex items-center justify-start gap-2 rounded-md px-2 py-1 text-left text-xs text-slate-200 transition hover:bg-white/10"
            >
              <span>{entry.type === 'dir' ? '📁' : '📄'}</span>
              <span>{entry.name}</span>
            </button>
          ))}
          {!fileListResult && <p className="text-xs text-slate-300/75">输入目录后点击“列出”。</p>}
        </div>
      </article>

      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <h2 className="mb-2 text-sm font-semibold text-slate-100">文件读取与搜索</h2>

        <div className="mb-2 grid grid-cols-[1fr_90px] gap-2">
          <input
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={selectedFilePath}
            onChange={(e) => setSelectedFilePath(e.target.value)}
            placeholder="文件路径，例如 src/App.tsx 或绝对路径"
          />
          <button onClick={() => void readFile()} disabled={fileLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">读取</button>
        </div>

        <div className="mb-2 grid grid-cols-[1fr_90px] gap-2">
          <input
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={fileKeyword}
            onChange={(e) => setFileKeyword(e.target.value)}
            placeholder="搜索关键字，例如 MCP"
          />
          <button onClick={() => void searchFiles()} disabled={fileLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">搜索</button>
        </div>

        {fileError && <p className="mb-2 rounded-md border border-rose-300/30 bg-rose-400/10 px-2 py-1 text-xs text-rose-200">{fileError}</p>}

        {fileSearchResult && (
          <div className="mb-2 rounded-lg border border-white/10 bg-slate-950/40 p-2">
            <p className="mb-1 text-xs text-slate-200">命中 {fileSearchResult.matches.length} 个文件</p>
            <div className="max-h-28 overflow-auto text-xs text-slate-300/85">
              {fileSearchResult.matches.map((m) => (
                <div key={m}>{m}</div>
              ))}
            </div>
          </div>
        )}

        <div className="max-h-64 overflow-auto rounded-lg border border-white/10 bg-slate-950/70 p-2">
          <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs text-slate-200">
            {fileReadResult ? fileReadResult.content : '读取文件后在这里预览内容'}
          </pre>
        </div>
      </article>
    </div>
  )
}
