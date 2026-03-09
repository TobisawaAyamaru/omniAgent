import fs from 'node:fs'
import path from 'node:path'

export class FileTools {
  private allowedRoots: string[]

  constructor(defaultRootDir: string) {
    this.allowedRoots = [path.resolve(defaultRootDir)]
  }

  getAllowedRoots() {
    return [...this.allowedRoots]
  }

  addAllowedRoot(rootDir: string) {
    const abs = path.resolve(rootDir)
    if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) {
      throw new Error('目录不存在或不可访问')
    }
    if (!this.allowedRoots.includes(abs)) {
      this.allowedRoots.push(abs)
    }
    return this.getAllowedRoots()
  }

  removeAllowedRoot(rootDir: string) {
    const abs = path.resolve(rootDir)
    this.allowedRoots = this.allowedRoots.filter((r) => r !== abs)
    if (this.allowedRoots.length === 0) {
      throw new Error('至少保留一个可访问目录')
    }
    return this.getAllowedRoots()
  }

  private resolveSafe(target: string) {
    const input = target.trim() || '.'

    if (path.isAbsolute(input)) {
      const abs = path.resolve(input)
      const hit = this.allowedRoots.find((root) => abs.startsWith(root))
      if (!hit) throw new Error('路径越界：不在可访问目录白名单内')
      return abs
    }

    const primaryRoot = this.allowedRoots[0]
    const abs = path.resolve(primaryRoot, input)
    if (!abs.startsWith(primaryRoot)) {
      throw new Error('路径越界：仅允许访问当前根目录内文件')
    }
    return abs
  }

  private asDisplayPath(absPath: string) {
    const root = this.allowedRoots.find((r) => absPath.startsWith(r))
    if (!root) return absPath
    const rel = path.relative(root, absPath) || '.'
    return `${root}::${rel}`
  }

  list(targetDir = '.') {
    const abs = this.resolveSafe(targetDir)
    const stat = fs.statSync(abs)
    if (!stat.isDirectory()) throw new Error('目标不是目录')

    const entries = fs
      .readdirSync(abs, { withFileTypes: true })
      .slice(0, 200)
      .map((e) => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }))

    return {
      dir: this.asDisplayPath(abs),
      entries,
    }
  }

  read(targetPath: string) {
    const abs = this.resolveSafe(targetPath)
    const stat = fs.statSync(abs)
    if (!stat.isFile()) throw new Error('目标不是文件')
    if (stat.size > 1024 * 1024) throw new Error('文件过大（>1MB）')

    return {
      path: this.asDisplayPath(abs),
      content: fs.readFileSync(abs, 'utf-8'),
    }
  }

  search(keyword: string, targetDir = '.') {
    const abs = this.resolveSafe(targetDir)
    const stat = fs.statSync(abs)
    if (!stat.isDirectory()) throw new Error('目标不是目录')

    const matches: string[] = []
    const walk = (dir: string) => {
      for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
        if (matches.length >= 80) return
        const full = path.join(dir, item.name)
        if (item.isDirectory()) {
          if (['node_modules', '.git', 'dist', 'dist-electron'].includes(item.name)) continue
          walk(full)
          continue
        }
        if (!item.isFile()) continue

        try {
          const text = fs.readFileSync(full, 'utf-8')
          if (text.includes(keyword)) matches.push(this.asDisplayPath(full))
        } catch {
          // ignore
        }
      }
    }

    walk(abs)

    return {
      keyword,
      dir: this.asDisplayPath(abs),
      matches,
    }
  }
}
