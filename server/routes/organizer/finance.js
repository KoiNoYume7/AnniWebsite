// ── Finance routes — /api/organizer/finance ──
// CRUD for income/expense entries. All behind requireAuth.

import db from '../../db/db.js'

const listEntries  = db.prepare('SELECT * FROM finance_entries WHERE user_id = ? ORDER BY entry_date DESC, created_at DESC')
const listInRange  = db.prepare('SELECT * FROM finance_entries WHERE user_id = ? AND entry_date >= ? AND entry_date <= ? ORDER BY entry_date DESC')
const getEntry     = db.prepare('SELECT * FROM finance_entries WHERE id = ? AND user_id = ?')
const insertEntry  = db.prepare(`
  INSERT INTO finance_entries (user_id, type, amount_cents, category, description, entry_date)
  VALUES (@user_id, @type, @amount_cents, @category, @description, @entry_date)
`)
const updateEntry  = db.prepare(`
  UPDATE finance_entries SET type = @type, amount_cents = @amount_cents,
    category = @category, description = @description, entry_date = @entry_date
  WHERE id = @id AND user_id = @user_id
`)
const deleteEntry  = db.prepare('DELETE FROM finance_entries WHERE id = ? AND user_id = ?')
const summarize    = db.prepare(`
  SELECT type, SUM(amount_cents) AS total_cents, COUNT(*) AS count
  FROM finance_entries WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
  GROUP BY type
`)
const byCategory   = db.prepare(`
  SELECT category, type, SUM(amount_cents) AS total_cents
  FROM finance_entries WHERE user_id = ? AND entry_date >= ? AND entry_date <= ?
  GROUP BY category, type ORDER BY total_cents DESC
`)

export function registerFinanceRoutes(app, { requireAuth }) {

  // GET /api/organizer/finance?from=YYYY-MM-DD&to=YYYY-MM-DD
  app.get('/api/organizer/finance', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const { from, to } = req.query

    let entries, summary, categories
    if (from && to) {
      entries    = listInRange.all(userId, from, to)
      summary    = summarize.all(userId, from, to)
      categories = byCategory.all(userId, from, to)
    } else {
      entries    = listEntries.all(userId)
      const defaultFrom = '1970-01-01'
      const defaultTo   = '2999-12-31'
      summary    = summarize.all(userId, defaultFrom, defaultTo)
      categories = byCategory.all(userId, defaultFrom, defaultTo)
    }

    res.json({ ok: true, data: entries, summary, categories })
  })

  // POST /api/organizer/finance
  app.post('/api/organizer/finance', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const { type, amount, category, description, entry_date } = req.body

    if (!type || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ ok: false, error: 'type must be income or expense' })
    }
    if (!amount || isNaN(parseFloat(amount))) {
      return res.status(400).json({ ok: false, error: 'Valid amount is required' })
    }
    if (!entry_date) {
      return res.status(400).json({ ok: false, error: 'entry_date is required' })
    }

    const amount_cents = Math.round(parseFloat(amount) * 100)

    const info = insertEntry.run({
      user_id: userId,
      type,
      amount_cents,
      category: (category || '').trim() || null,
      description: (description || '').trim() || null,
      entry_date,
    })

    const entry = getEntry.get(info.lastInsertRowid, userId)
    res.status(201).json({ ok: true, data: entry })
  })

  // PATCH /api/organizer/finance/:id
  app.patch('/api/organizer/finance/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const id = parseInt(req.params.id)
    const existing = getEntry.get(id, userId)
    if (!existing) return res.status(404).json({ ok: false, error: 'Entry not found' })

    const type = req.body.type ?? existing.type
    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ ok: false, error: 'type must be income or expense' })
    }

    const rawAmount = req.body.amount !== undefined ? req.body.amount : existing.amount_cents / 100
    const amount_cents = Math.round(parseFloat(rawAmount) * 100)

    updateEntry.run({
      id, user_id: userId, type, amount_cents,
      category: (req.body.category ?? (existing.category || '')).trim() || null,
      description: (req.body.description ?? (existing.description || '')).trim() || null,
      entry_date: req.body.entry_date ?? existing.entry_date,
    })

    res.json({ ok: true, data: getEntry.get(id, userId) })
  })

  // DELETE /api/organizer/finance/:id
  app.delete('/api/organizer/finance/:id', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const id = parseInt(req.params.id)
    const existing = getEntry.get(id, userId)
    if (!existing) return res.status(404).json({ ok: false, error: 'Entry not found' })

    deleteEntry.run(id, userId)
    res.json({ ok: true })
  })
}
