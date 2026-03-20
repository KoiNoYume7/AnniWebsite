// ── User routes — /api/user/* ──

import db from '../db/db.js'

const getUserById = db.prepare('SELECT * FROM users WHERE id = ?')

export function registerUserRoutes(app, { requireAuth }) {
  // GET /api/user/me — full DB user record (used by organizer dashboard)
  app.get('/api/user/me', requireAuth, (req, res) => {
    const user = getUserById.get(req.session.user.id)
    if (!user) return res.status(404).json({ ok: false, error: 'User not found' })
    res.json({ ok: true, user })
  })
}
