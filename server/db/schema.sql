-- AnniWebsite — sc.yumehana.dev data + AI usage
-- Users are owned by AnniCore (annicore.db). user_id here is a TEXT FK by convention.

-- ── Star Citizen Tools (sc.yumehana.dev) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS sc_inventory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT    NOT NULL,
  item_name   TEXT    NOT NULL,
  category    TEXT    NOT NULL DEFAULT 'cz_loot',  -- e.g. cz_loot, ship_part, consumable
  quantity    INTEGER NOT NULL DEFAULT 1,
  notes       TEXT,
  updated_at  INTEGER DEFAULT (unixepoch()),
  created_at  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sc_groups (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT    NOT NULL,
  owner_id    TEXT    NOT NULL,
  invite_code TEXT    NOT NULL UNIQUE,
  created_at  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sc_group_members (
  group_id    INTEGER NOT NULL REFERENCES sc_groups(id) ON DELETE CASCADE,
  user_id     TEXT    NOT NULL,
  role        TEXT    NOT NULL DEFAULT 'member',   -- owner | member
  joined_at   INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (group_id, user_id)
);

-- ── AI Usage ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  model TEXT,
  context TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
