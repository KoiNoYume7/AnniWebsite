import crypto from 'crypto'
import db from '../db/db.js'

// ── Prepared statements ──────────────────────────────────────────────────────

const getInventory = db.prepare(`
  SELECT id, item_name, category, quantity, notes, updated_at
  FROM sc_inventory WHERE user_id = ? ORDER BY category, item_name
`)
const upsertInventoryItem = db.prepare(`
  INSERT INTO sc_inventory (user_id, item_name, category, quantity, notes)
  VALUES (@userId, @itemName, @category, @quantity, @notes)
  ON CONFLICT DO NOTHING
`)
const updateQuantity = db.prepare(`
  UPDATE sc_inventory SET quantity = @quantity, notes = @notes, updated_at = unixepoch()
  WHERE id = @id AND user_id = @userId
`)
const deleteItem = db.prepare(`
  DELETE FROM sc_inventory WHERE id = ? AND user_id = ?
`)

const getGroupsForUser = db.prepare(`
  SELECT g.id, g.name, g.invite_code, g.owner_id, g.created_at,
         m.role AS my_role,
         (SELECT COUNT(*) FROM sc_group_members WHERE group_id = g.id) AS member_count
  FROM sc_groups g
  JOIN sc_group_members m ON m.group_id = g.id AND m.user_id = ?
  ORDER BY g.created_at DESC
`)
const getGroupById = db.prepare(`SELECT * FROM sc_groups WHERE id = ?`)
const getGroupByCode = db.prepare(`SELECT * FROM sc_groups WHERE invite_code = ?`)
const isMember = db.prepare(`SELECT 1 FROM sc_group_members WHERE group_id = ? AND user_id = ?`)
const getGroupInventory = db.prepare(`
  SELECT si.item_name, si.category, SUM(si.quantity) AS total_qty,
         COUNT(DISTINCT si.user_id) AS contributors
  FROM sc_inventory si
  JOIN sc_group_members gm ON gm.user_id = si.user_id AND gm.group_id = ?
  GROUP BY si.item_name, si.category
  ORDER BY si.category, si.item_name
`)
const insertGroup = db.prepare(`
  INSERT INTO sc_groups (name, owner_id, invite_code) VALUES (?, ?, ?)
`)
const insertMember = db.prepare(`
  INSERT OR IGNORE INTO sc_group_members (group_id, user_id, role) VALUES (?, ?, ?)
`)
const removeMember = db.prepare(`
  DELETE FROM sc_group_members WHERE group_id = ? AND user_id = ?
`)
const deleteGroup = db.prepare(`DELETE FROM sc_groups WHERE id = ? AND owner_id = ?`)

// ── Route registration ───────────────────────────────────────────────────────

export function registerScRoutes(app, { requireAuth }) {

  // GET /api/sc/inventory — own loot list
  app.get('/api/sc/inventory', requireAuth, (req, res) => {
    const userId = req.session.user.id
    res.json({ ok: true, items: getInventory.all(userId) })
  })

  // POST /api/sc/inventory — add / update an item
  app.post('/api/sc/inventory', requireAuth, (req, res) => {
    const { item_name, category = 'cz_loot', quantity = 1, notes = '' } = req.body || {}
    if (!item_name) return res.status(400).json({ ok: false, error: 'item_name required' })
    const userId = req.session.user.id

    const existing = db.prepare(
      `SELECT id FROM sc_inventory WHERE user_id = ? AND item_name = ? AND category = ?`
    ).get(userId, item_name, category)

    if (existing) {
      updateQuantity.run({ quantity, notes, id: existing.id, userId })
    } else {
      upsertInventoryItem.run({ userId, itemName: item_name, category, quantity, notes })
    }
    res.json({ ok: true, items: getInventory.all(userId) })
  })

  // DELETE /api/sc/inventory/:id — remove an item
  app.delete('/api/sc/inventory/:id', requireAuth, (req, res) => {
    deleteItem.run(req.params.id, req.session.user.id)
    res.json({ ok: true })
  })

  // GET /api/sc/groups — groups the user belongs to
  app.get('/api/sc/groups', requireAuth, (req, res) => {
    res.json({ ok: true, groups: getGroupsForUser.all(req.session.user.id) })
  })

  // POST /api/sc/groups — create a new group
  app.post('/api/sc/groups', requireAuth, (req, res) => {
    const { name } = req.body || {}
    if (!name) return res.status(400).json({ ok: false, error: 'name required' })
    const userId = req.session.user.id
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    const { lastInsertRowid } = insertGroup.run(name, userId, code)
    insertMember.run(lastInsertRowid, userId, 'owner')
    res.json({ ok: true, group: getGroupById.get(lastInsertRowid) })
  })

  // POST /api/sc/groups/join — join via invite code
  app.post('/api/sc/groups/join', requireAuth, (req, res) => {
    const { invite_code } = req.body || {}
    if (!invite_code) return res.status(400).json({ ok: false, error: 'invite_code required' })
    const group = getGroupByCode.get(invite_code.trim().toUpperCase())
    if (!group) return res.status(404).json({ ok: false, error: 'Invalid invite code' })
    const userId = req.session.user.id
    if (isMember.get(group.id, userId)) {
      return res.json({ ok: true, group, already: true })
    }
    insertMember.run(group.id, userId, 'member')
    res.json({ ok: true, group })
  })

  // DELETE /api/sc/groups/:id/leave — leave a group
  app.delete('/api/sc/groups/:id/leave', requireAuth, (req, res) => {
    const userId = req.session.user.id
    const group = getGroupById.get(req.params.id)
    if (!group) return res.status(404).json({ ok: false, error: 'Group not found' })
    if (group.owner_id === userId) {
      deleteGroup.run(group.id, userId)
    } else {
      removeMember.run(group.id, userId)
    }
    res.json({ ok: true })
  })

  // GET /api/sc/groups/:id/inventory — combined group loot view
  app.get('/api/sc/groups/:id/inventory', requireAuth, (req, res) => {
    const userId = req.session.user.id
    if (!isMember.get(req.params.id, userId)) {
      return res.status(403).json({ ok: false, error: 'Not a member' })
    }
    res.json({ ok: true, items: getGroupInventory.all(req.params.id) })
  })
}
