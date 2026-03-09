import { PRIORITY_LABELS } from '../constants'

type TasksPanelProps = {
  tasks: TaskItem[]
  taskTitle: string
  taskPriority: TaskPriority
  taskDueDate: string
  taskTags: string
  taskLoading: boolean
  taskError: string
  editingTaskId: number | null
  editingTitle: string
  setTaskTitle: (v: string) => void
  setTaskPriority: (v: TaskPriority) => void
  setTaskDueDate: (v: string) => void
  setTaskTags: (v: string) => void
  setEditingTitle: (v: string) => void
  onCreateTask: () => void
  onLoadTasks: () => void
  onToggleTask: (id: number) => void
  onStartEditTask: (task: TaskItem) => void
  onCancelEditTask: () => void
  onSaveEditTask: (id: number) => void
  onDeleteTask: (id: number) => void
}

const priorityClass: Record<TaskPriority, string> = {
  low: 'border-emerald-300/40 text-emerald-300',
  medium: 'border-amber-300/40 text-amber-300',
  high: 'border-rose-300/40 text-rose-300',
}

export function TasksPanel(props: TasksPanelProps) {
  const {
    tasks,
    taskTitle,
    taskPriority,
    taskDueDate,
    taskTags,
    taskLoading,
    taskError,
    editingTaskId,
    editingTitle,
    setTaskTitle,
    setTaskPriority,
    setTaskDueDate,
    setTaskTags,
    setEditingTitle,
    onCreateTask,
    onLoadTasks,
    onToggleTask,
    onStartEditTask,
    onCancelEditTask,
    onSaveEditTask,
    onDeleteTask,
  } = props

  return (
    <div className="grid gap-3">
      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <h2 className="mb-3 text-sm font-semibold text-slate-100">新建任务</h2>
        <div className="grid grid-cols-[1.2fr_110px_140px_1fr_80px] items-center gap-2">
          <input
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
            placeholder="例如：整理本周迭代计划"
          />
          <select
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={taskPriority}
            onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
          >
            <option value="low">低优先级</option>
            <option value="medium">中优先级</option>
            <option value="high">高优先级</option>
          </select>
          <input
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            type="date"
            value={taskDueDate}
            onChange={(e) => setTaskDueDate(e.target.value)}
          />
          <input
            className="h-9 rounded-lg border border-white/15 bg-slate-950/70 px-3 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
            value={taskTags}
            onChange={(e) => setTaskTags(e.target.value)}
            placeholder="标签，逗号分隔"
          />
          <button onClick={onCreateTask} disabled={taskLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">创建</button>
        </div>
        {taskError && <p className="mt-2 rounded-md border border-rose-300/30 bg-rose-400/10 px-2 py-1 text-xs text-rose-200">{taskError}</p>}
      </article>

      <article className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-lg backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-100">任务列表</h2>
          <button onClick={onLoadTasks} disabled={taskLoading} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-50">刷新</button>
        </div>

        <div className="grid gap-2">
          {taskLoading && tasks.length === 0 && <p className="text-xs text-slate-300/80">正在加载...</p>}
          {!taskLoading && tasks.length === 0 && <p className="text-xs text-slate-300/80">暂无任务，先创建一个吧。</p>}

          {tasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 p-2.5">
              <label className="flex min-w-0 flex-1 items-center gap-2 text-sm text-slate-100">
                <input type="checkbox" checked={task.completed === 1} onChange={() => onToggleTask(task.id)} />
                {editingTaskId === task.id ? (
                  <input
                    className="h-8 min-w-[220px] rounded-lg border border-white/15 bg-slate-950/70 px-2 text-sm text-slate-100 outline-none focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-400/30"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onSaveEditTask(task.id)
                      if (e.key === 'Escape') onCancelEditTask()
                    }}
                  />
                ) : (
                  <span className={task.completed ? 'line-through opacity-60' : ''}>{task.title}</span>
                )}
              </label>
              <div className="flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[11px] ${priorityClass[task.priority]}`}>{PRIORITY_LABELS[task.priority]}</span>
                {task.dueDate && <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">{task.dueDate}</span>}
                {task.tags && <span className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">{task.tags}</span>}
                {editingTaskId === task.id ? (
                  <>
                    <button onClick={() => onSaveEditTask(task.id)} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">保存</button>
                    <button onClick={onCancelEditTask} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">取消</button>
                  </>
                ) : (
                  <button onClick={() => onStartEditTask(task)} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-cyan-400/25">编辑</button>
                )}
                <button onClick={() => onDeleteTask(task.id)} className="h-8 rounded-lg border border-white/20 bg-white/10 px-3 text-xs text-slate-100 transition hover:bg-rose-400/25">删除</button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </div>
  )
}
