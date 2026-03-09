import { ipcMain } from 'electron'
import { FileTools } from '../services/ai-tools'

export function registerFileHandlers(fileTools: FileTools) {
  ipcMain.handle('file:get-roots', () => {
    return { roots: fileTools.getAllowedRoots() }
  })

  ipcMain.handle('file:add-root', (_event, rootDir: string) => {
    if (typeof rootDir !== 'string' || rootDir.trim().length === 0) {
      throw new Error('目录不能为空')
    }
    return { roots: fileTools.addAllowedRoot(rootDir.trim()) }
  })

  ipcMain.handle('file:remove-root', (_event, rootDir: string) => {
    if (typeof rootDir !== 'string' || rootDir.trim().length === 0) {
      throw new Error('目录不能为空')
    }
    return { roots: fileTools.removeAllowedRoot(rootDir.trim()) }
  })

  ipcMain.handle('file:list', (_event, dir?: string) => {
    return fileTools.list(typeof dir === 'string' ? dir : '.')
  })

  ipcMain.handle('file:read', (_event, filePath: string) => {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      throw new Error('文件路径不能为空')
    }
    return fileTools.read(filePath)
  })

  ipcMain.handle('file:search', (_event, payload: { keyword: string; dir?: string }) => {
    if (!payload || typeof payload.keyword !== 'string' || payload.keyword.trim().length === 0) {
      throw new Error('搜索关键字不能为空')
    }

    const keyword = payload.keyword.trim()
    const dir = typeof payload.dir === 'string' ? payload.dir : '.'
    return fileTools.search(keyword, dir)
  })
}
