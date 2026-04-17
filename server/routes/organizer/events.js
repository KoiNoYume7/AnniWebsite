// ── Calendar event routes — /api/organizer/events ──
// CRUD for calendar events. All behind requireAuth.

import db from '../../db/db.js'

const listEvents  = db.prepare('SELECT * FROM events WHERE user_id = ? ORDER BY start_at ASC')
const listInRange = db.prepare('SELECT * FROM events WHERE user_id = ? AND start_at >= ? AND start_at < ? ORDER BY start_at ASC')
const getEvent    = db.prepare('SELECT * FROM events WHERE id = ? AND user_id = ?')
const insertEvent = db.prepare(`
  INSERT INTO events (user_id, title, description, start_at, end_at, all_day, color)
  VALUES (@user_id, @title, @description, @start_at, @end_at, @all_day, @color)
`)
const updateEvent = db.prepare(`
  UPDATE events SET title = @title, description = @description, start_at = @start_at,
    end_at = @end_at, all_day = @all_day, color = @color
  WHERE id = @id AND user_id = @user_id
`)
const deleteEvent = db.prepare('DELETE FROM events WHERE id = ? AND user_id = ?')

export function registerEventRoutes(app, { requireAuth }) {

  // GET /api/organizer/events?from=YYYY-MM-DD&to=YYYY-MM-DD
  app.get('/api/organizer/events', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const { from, to } = req.query

    let events
    if (from && to) {
      events = listInRange.all(userId, from, to)
    } else {
      events = listEvents.all(userId)
    }
    res.json({ ok: true, data: events })
  })

  // POST /api/organizer/events
  app.post('/api/organizer/events', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const { title, description, start_at, end_at, all_day, color } = req.body

    if (!title || !title.trim()) {
      return res.status(400).json({ ok: false, error: 'Title is required' })
    }
    if (!start_at) {
      return res.status(400).json({ ok: false, error: 'start_at is required' })
    }

    const info = insertEvent.run({
      user_id: userId,
      title: title.trim(),
      description: (description || '').trim() || null,
      start_at,
      end_at: end_at || null,
      all_day: all_day ? 1 : 0,
      color: color || null,
    })

    const event = getEvent.get(info.lastInsertRowid, userId)
    res.status(201).json({ ok: true, data: event })
  })

  // PATCH /api/organizer/events/:id
  app.patch('/api/organizer/events/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const id = parseInt(req.params.id)
    const existing = getEvent.get(id, userId)
    if (!existing) return res.status(404).json({ ok: false, error: 'Event not found' })

    const title = (req.body.title ?? existing.title).toString().trim()
    if (!title) return res.status(400).json({ ok: false, error: 'Title is required' })

    updateEvent.run({
      id,
      user_id: userId,
      title,
      description: (req.body.description ?? existing.description) || null,
      start_at: req.body.start_at ?? existing.start_at,
      end_at: req.body.end_at !== undefined ? (req.body.end_at || null) : existing.end_at,
      all_day: req.body.all_day !== undefined ? (req.body.all_day ? 1 : 0) : existing.all_day,
      color: req.body.color !== undefined ? (req.body.color || null) : existing.color,
    })

    const updated = getEvent.get(id, userId)
    res.json({ ok: true, data: updated })
  })

  // DELETE /api/organizer/events/:id
  app.delete('/api/organizer/events/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const id = parseInt(req.params.id)
    const existing = getEvent.get(id, userId)
    if (!existing) return res.status(404).json({ ok: false, error: 'Event not found' })

    deleteEvent.run(id, userId)
    res.json({ ok: true })
  })
}
