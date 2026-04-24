-- Schema for AnniWebsite organizer

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  subscription_status TEXT,
  subscription_tier TEXT,
  tokens_used_month INTEGER DEFAULT 0,
  tokens_reset_at INTEGER,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,
  due_date TEXT,
  list_name TEXT DEFAULT 'default',
  sort_order INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_at TEXT NOT NULL,
  end_at TEXT,
  all_day INTEGER DEFAULT 0,
  recurrence TEXT,
  color TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  remind_at TEXT NOT NULL,
  repeat_cron TEXT,
  delivered INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  category TEXT,
  description TEXT,
  entry_date TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- ── Star Citizen Tools (sc.yumehana.dev) ────────────────────────────────────

CREATE TABLE IF NOT EXISTS sc_inventory (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
  owner_id    TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invite_code TEXT    NOT NULL UNIQUE,
  created_at  INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS sc_group_members (
  group_id    INTEGER NOT NULL REFERENCES sc_groups(id) ON DELETE CASCADE,
  user_id     TEXT    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role        TEXT    NOT NULL DEFAULT 'member',   -- owner | member
  joined_at   INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (group_id, user_id)
);

-- ── AI Usage ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  model TEXT,
  context TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);
