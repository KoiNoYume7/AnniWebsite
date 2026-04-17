// ── Reminder routes — /api/organizer/reminders ──
// CRUD + mark delivered. All behind requireAuth.

import db from '../../db/db.js'

const listReminders  = db.prepare('SELECT * FROM reminders WHERE user_id = ? ORDER BY remind_at ASC')
const getReminder    = db.prepare('SELECT * FROM reminders WHERE id = ? AND user_id = ?')
const insertReminder = db.prepare(`
  INSERT INTO reminders (user_id, title, body, remind_at, repeat_cron)
  VALUES (@user_id, @title, @body, @remind_at, @repeat_cron)
`)
const updateReminder = db.prepare(`
  UPDATE reminders SET title = @title, body = @body,
    remind_at = @remind_at, repeat_cron = @repeat_cron, delivered = @delivered
  WHERE id = @id AND user_id = @user_id
`)
const deleteReminder = db.prepare('DELETE FROM reminders WHERE id = ? AND user_id = ?')
const markDelivered  = db.prepare('UPDATE reminders SET delivered = 1 WHERE id = ? AND user_id = ?')

// Pending reminders check — used by the SSE push endpoint
export const getPendingReminders = db.prepare(
  `SELECT * FROM reminders WHERE user_id = ? AND delivered = 0 AND remind_at <= datetime('now') ORDER BY remind_at ASC`
)

export function registerReminderRoutes(app, { requireAuth }) {

  // GET /api/organizer/reminders
  app.get('/api/organizer/reminders', requireAuth, (req, res) => {
    const reminders = listReminders.all(req.session.user.id)
    res.json({ ok: true, data: reminders })
  })

  // POST /api/organizer/reminders
  app.post('/api/organizer/reminders', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const { title, body, remind_at, repeat_cron } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ ok: false, error: 'Title is required' })
    }
    if (!remind_at) {
      return res.status(400).json({ ok: false, error: 'remind_at is required' })
    }

    const info = insertReminder.run({
      user_id: userId,
      title: title.trim(),
      body: (body || '').trim() || null,
      remind_at,
      repeat_cron: repeat_cron || null,
    })

    const reminder = getReminder.get(info.lastInsertRowid, userId)
    res.status(201).json({ ok: true, data: reminder })
  })

  // PATCH /api/organizer/reminders/:id
  app.patch('/api/organizer/reminders/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const id = parseInt(req.params.id)
    const existing = getReminder.get(id, userId)
    if (!existing) return res.status(404).json({ ok: false, error: 'Reminder not found' })

    // Dismiss shortcut: { delivered: true }
    if (req.body.delivered === true) {
      markDelivered.run(id, userId)
      return res.json({ ok: true, data: getReminder.get(id, userId) })
    }

    const title = (req.body.title ?? existing.title).toString().trim()
    if (!title) return res.status(400).json({ ok: false, error: 'Title is required' })

    updateReminder.run({
      id,
      user_id: userId,
      title,
      body: (req.body.body ?? existing.body) || null,
      remind_at: req.body.remind_at ?? existing.remind_at,
      repeat_cron: req.body.repeat_cron !== undefined ? (req.body.repeat_cron || null) : existing.repeat_cron,
      delivered: req.body.delivered !== undefined ? (req.body.delivered ? 1 : 0) : existing.delivered,
    })

    res.json({ ok: true, data: getReminder.get(id, userId) })
  })

  // DELETE /api/organizer/reminders/:id
  app.delete('/api/organizer/reminders/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const id = parseInt(req.params.id)
    const existing = getReminder.get(id, userId)
    if (!existing) return res.status(404).json({ ok: false, error: 'Reminder not found' })

    deleteReminder.run(id, userId)
    res.json({ ok: true })
  })
}
