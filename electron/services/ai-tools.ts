import fs from 'node:fs'
import path from 'node:path'

export class FileTools {
  private readonly rootDir: string

  constructor(rootDir: string) {
    this.rootDir = path.resolve(rootDir)
  }

  private resolveSafe(target: string) {
    const normalized = target.trim() || '.'
    const abs = path.resolve(this.rootDir, normalized)
    if (!abs.startsWith(this.rootDir)) {
      throw new Error('路径越界：仅允许访问工作目录内文件')
    }
    return abs
  }

  list(relDir = '.') {
    const abs = this.resolveSafe(relDir)
    const stat = fs.statSync(abs)
    if (!stat.isDirectory()) throw new Error('目标不是目录')

    const entries = fs
      .readdirSync(abs, { withFileTypes: true })
      .slice(0, 100)
      .map((e) => ({
        name: e.name,
        type: e.isDirectory() ? 'dir' : 'file',
      }))

    return {
      dir: path.relative(this.rootDir, abs) || '.',
      entries,
    }
  }

  read(relPath: string) {
    const abs = this.resolveSafe(relPath)
    const stat = fs.statSync(abs)
    if (!stat.isFile()) throw new Error('目标不是文件')
    if (stat.size > 1024 * 1024) throw new Error('文件过大（>1MB）')

    const content = fs.readFileSync(abs, 'utf-8')
    return {
      path: path.relative(this.rootDir, abs),
      content,
    }
  }

  search(keyword: string, relDir = '.') {
    const abs = this.resolveSafe(relDir)
    const stat = fs.statSync(abs)
    if (!stat.isDirectory()) throw new Error('目标不是目录')

    const out: string[] = []
    const walk = (dir: string) => {
      const list = fs.readdirSync(dir, { withFileTypes: true })
      for (const item of list) {
        if (out.length >= 50) return
        const full = path.join(dir, item.name)
        if (item.isDirectory()) {
          if (['node_modules', '.git', 'dist', 'dist-electron'].includes(item.name)) continue
          walk(full)
          continue
        }

        if (!item.isFile()) continue
        try {
          const text = fs.readFileSync(full, 'utf-8')
          if (text.includes(keyword)) {
            out.push(path.relative(this.rootDir, full))
          }
        } catch {
          // ignore binary/permission errors
        }
      }
    }

    walk(abs)
    return {
      keyword,
      dir: path.relative(this.rootDir, abs) || '.',
      matches: out,
    }
  }
}
