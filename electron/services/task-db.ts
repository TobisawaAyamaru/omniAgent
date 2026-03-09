import Database from 'better-sqlite3'

export type TaskPriority = 'low' | 'medium' | 'high'

export type TaskItem = {
  id: number
  title: string
  completed: number
  priority: TaskPriority
  dueDate: string | null
  tags: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type CreateTaskInput = {
  title: string
  priority?: TaskPriority
  dueDate?: string | null
  tags?: string
  notes?: string
}

export type UpdateTaskInput = {
  id: number
  title?: string
  priority?: TaskPriority
  dueDate?: string | null
  tags?: string
  notes?: string
}

export class TaskDB {
  private db: Database.Database

  constructor(dbPath: string) {
    this.db = new Database(dbPath)
    this.init()
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        priority TEXT NOT NULL DEFAULT 'medium',
        due_date TEXT,
        tags TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
    `)
  }

  listTasks(): TaskItem[] {
    const stmt = this.db.prepare(`
      SELECT
        id,
        title,
        completed,
        priority,
        due_date as dueDate,
        tags,
        notes,
        created_at as createdAt,
        updated_at as updatedAt
      FROM tasks
      ORDER BY completed ASC, created_at DESC
    `)
    return stmt.all() as TaskItem[]
  }

  createTask(input: CreateTaskInput): TaskItem {
    const now = new Date().toISOString()
    const stmt = this.db.prepare(`
      INSERT INTO tasks (title, completed, priority, due_date, tags, notes, created_at, updated_at)
      VALUES (@title, 0, @priority, @dueDate, @tags, @notes, @createdAt, @updatedAt)
    `)

    const result = stmt.run({
      title: input.title.trim(),
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate ?? null,
      tags: input.tags ?? '',
      notes: input.notes ?? '',
      createdAt: now,
      updatedAt: now,
    })

    const row = this.db
      .prepare(`
        SELECT
          id,
          title,
          completed,
          priority,
          due_date as dueDate,
          tags,
          notes,
          created_at as createdAt,
          updated_at as updatedAt
        FROM tasks
        WHERE id = ?
      `)
      .get(result.lastInsertRowid) as TaskItem

    return row
  }

  toggleTask(id: number): TaskItem | null {
    const now = new Date().toISOString()
    const updateStmt = this.db.prepare(`
      UPDATE tasks
      SET completed = CASE completed WHEN 1 THEN 0 ELSE 1 END,
          updated_at = ?
      WHERE id = ?
    `)
    const result = updateStmt.run(now, id)

    if (result.changes === 0) return null

    const row = this.db
      .prepare(`
        SELECT
          id,
          title,
          completed,
          priority,
          due_date as dueDate,
          tags,
          notes,
          created_at as createdAt,
          updated_at as updatedAt
        FROM tasks
        WHERE id = ?
      `)
      .get(id) as TaskItem

    return row
  }

  updateTask(input: UpdateTaskInput): TaskItem | null {
    const current = this.db
      .prepare(`
        SELECT
          id,
          title,
          completed,
          priority,
          due_date as dueDate,
          tags,
          notes,
          created_at as createdAt,
          updated_at as updatedAt
        FROM tasks
        WHERE id = ?
      `)
      .get(input.id) as TaskItem | undefined

    if (!current) return null

    const now = new Date().toISOString()
    const nextTitle = input.title?.trim() ? input.title.trim() : current.title

    this.db
      .prepare(`
        UPDATE tasks
        SET title = @title,
            priority = @priority,
            due_date = @dueDate,
            tags = @tags,
            notes = @notes,
            updated_at = @updatedAt
        WHERE id = @id
      `)
      .run({
        id: input.id,
        title: nextTitle,
        priority: input.priority ?? current.priority,
        dueDate: input.dueDate === undefined ? current.dueDate : input.dueDate,
        tags: input.tags ?? current.tags,
        notes: input.notes ?? current.notes,
        updatedAt: now,
      })

    const updated = this.db
      .prepare(`
        SELECT
          id,
          title,
          completed,
          priority,
          due_date as dueDate,
          tags,
          notes,
          created_at as createdAt,
          updated_at as updatedAt
        FROM tasks
        WHERE id = ?
      `)
      .get(input.id) as TaskItem

    return updated
  }

  deleteTask(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?')
    const result = stmt.run(id)
    return result.changes > 0
  }
}
