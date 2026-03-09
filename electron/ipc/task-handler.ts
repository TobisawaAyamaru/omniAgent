import { app, ipcMain } from 'electron'
import path from 'node:path'
import { CreateTaskInput, TaskDB, UpdateTaskInput } from '../services/task-db'

const dbPath = path.join(app.getPath('userData'), 'omniagent.db')
const taskDB = new TaskDB(dbPath)

export function getTaskDB() {
  return taskDB
}

export function registerTaskHandlers() {
  ipcMain.handle('task:list', () => {
    return taskDB.listTasks()
  })

  ipcMain.handle('task:create', (_event, input: CreateTaskInput) => {
    if (!input || typeof input.title !== 'string' || input.title.trim().length === 0) {
      throw new Error('任务标题不能为空')
    }
    return taskDB.createTask(input)
  })

  ipcMain.handle('task:toggle', (_event, id: number) => {
    if (typeof id !== 'number') {
      throw new Error('任务ID无效')
    }
    return taskDB.toggleTask(id)
  })

  ipcMain.handle('task:update', (_event, input: UpdateTaskInput) => {
    if (!input || typeof input.id !== 'number') {
      throw new Error('任务ID无效')
    }

    if (input.title !== undefined && input.title.trim().length === 0) {
      throw new Error('任务标题不能为空')
    }

    return taskDB.updateTask(input)
  })

  ipcMain.handle('task:delete', (_event, id: number) => {
    if (typeof id !== 'number') {
      throw new Error('任务ID无效')
    }
    return { ok: taskDB.deleteTask(id) }
  })
}
