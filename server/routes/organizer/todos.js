// ── Todo routes — /api/organizer/todos ──
// CRUD + bulk reorder. All behind requireAuth.

import db from '../../db/db.js'

// Prepared statements
const listTodos   = db.prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY list_name, sort_order, created_at DESC')
const getTodo     = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
const insertTodo  = db.prepare(`
  INSERT INTO todos (user_id, title, description, priority, due_date, list_name, sort_order)
  VALUES (@user_id, @title, @description, @priority, @due_date, @list_name, @sort_order)
`)
const updateTodo  = db.prepare(`
  UPDATE todos SET title = @title, description = @description, completed = @completed,
    priority = @priority, due_date = @due_date, list_name = @list_name,
    sort_order = @sort_order, updated_at = unixepoch()
  WHERE id = @id AND user_id = @user_id
`)
const toggleTodo  = db.prepare('UPDATE todos SET completed = NOT completed, updated_at = unixepoch() WHERE id = ? AND user_id = ?')
const deleteTodo  = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
const reorderTodo = db.prepare('UPDATE todos SET sort_order = ?, list_name = ?, updated_at = unixepoch() WHERE id = ? AND user_id = ?')
const getMaxOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM todos WHERE user_id = ? AND list_name = ?')
const listNames   = db.prepare('SELECT DISTINCT list_name FROM todos WHERE user_id = ? ORDER BY list_name')

export function registerTodoRoutes(app, { requireAuth }) {

  // GET /api/organizer/todos — list all for current user
  app.get('/api/organizer/todos', requireAuth, (req, res) => {
    const todos = listTodos.all(req.session.user.id)
    const lists = listNames.all(req.session.user.id).map(r => r.list_name)
    res.json({ ok: true, data: todos, lists })
  })

  // PATCH /api/organizer/todos/reorder — bulk sort_order update
  // MUST be before /:id routes so Express doesn't match 'reorder' as an id
  // Body: { items: [{ id, sort_order, list_name }] }
  app.patch('/api/organizer/todos/reorder', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const { items } = req.body

    if (!Array.isArray(items)) {
      return res.status(400).json({ ok: false, error: 'items array required' })
    }

    const runReorder = db.transaction(() => {
      for (const item of items) {
        reorderTodo.run(
          parseInt(item.sort_order) || 0,
          (item.list_name || 'default').trim(),
          parseInt(item.id),
          userId
        )
      }
    })

    runReorder()
    const todos = listTodos.all(userId)
    res.json({ ok: true, data: todos })
  })

  // POST /api/organizer/todos — create
  app.post('/api/organizer/todos', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const { title, description, priority, due_date, list_name } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ ok: false, error: 'Title is required' })
    }

    const listN = (list_name || 'default').trim()
    const nextOrder = getMaxOrder.get(userId, listN).next

    const info = insertTodo.run({
      user_id: userId,
      title: title.trim(),
      description: (description || '').trim() || null,
      priority: Math.max(0, Math.min(3, parseInt(priority) || 0)),
      due_date: due_date || null,
      list_name: listN,
      sort_order: nextOrder,
    })

    const todo = getTodo.get(info.lastInsertRowid, userId)
    res.status(201).json({ ok: true, data: todo })
  })

  // PATCH /api/organizer/todos/:id — update fields
  app.patch('/api/organizer/todos/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const id = parseInt(req.params.id)
    const existing = getTodo.get(id, userId)
    if (!existing) return res.status(404).json({ ok: false, error: 'Todo not found' })

    // Toggle shortcut: { toggle: true }
    if (req.body.toggle) {
      toggleTodo.run(id, userId)
      const updated = getTodo.get(id, userId)
      return res.json({ ok: true, data: updated })
    }

    const title = (req.body.title ?? existing.title).toString().trim()
    if (!title) return res.status(400).json({ ok: false, error: 'Title is required' })

    updateTodo.run({
      id,
      user_id: userId,
      title,
      description: (req.body.description ?? existing.description) || null,
      completed: req.body.completed !== undefined ? (req.body.completed ? 1 : 0) : existing.completed,
      priority: req.body.priority !== undefined ? Math.max(0, Math.min(3, parseInt(req.body.priority) || 0)) : existing.priority,
      due_date: req.body.due_date !== undefined ? (req.body.due_date || null) : existing.due_date,
      list_name: req.body.list_name !== undefined ? (req.body.list_name || 'default').trim() : existing.list_name,
      sort_order: req.body.sort_order !== undefined ? parseInt(req.body.sort_order) || 0 : existing.sort_order,
    })

    const updated = getTodo.get(id, userId)
    res.json({ ok: true, data: updated })
  })

  // DELETE /api/organizer/todos/:id
  app.delete('/api/organizer/todos/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const id = parseInt(req.params.id)
    const existing = getTodo.get(id, userId)
    if (!existing) return res.status(404).json({ ok: false, error: 'Todo not found' })

    deleteTodo.run(id, userId)
    res.json({ ok: true })
  })

}
