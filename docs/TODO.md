# AnniWebsite — Organizer Development Roadmap

*Last updated: April 2026*

---

## Current State

**Phase 0 and Phase 1 are complete.** The codebase now has:

- **Database**: SQLite via `better-sqlite3`, WAL mode, FK constraints. Six tables: `users`, `todos`, `events`, `reminders`, `finance_entries`, `ai_usage`.
- **Auth**: Open registration. Any GitHub/Discord/Google account gets a `free` role on first login. Env-var whitelists promote specific accounts to `admin` automatically.
- **Session store**: `connect-sqlite3` — sessions survive Node restarts.
- **nginx**: All `/api/*` proxied to Node :4000.
- **Frontend**: `#/organizer` route live, auth-gated, shows sidebar + tabs + user profile with token bar.
- **Content system**: All page content (projects, about, devlogs) is data-driven — edit `content/`, run compilers in `scripts/`, frontend reads from `client/src/data/`.
- **Dev mode**: `DEV_MODE=true` exposes `POST /api/dev/login` and shows a dev login button on the login page — no OAuth needed locally.

**Removed**: Pi dashboard (`#/status`), Python stats API (`stats/`), nginx `/api/stats` proxy — didn't fit the site direction.

**Fixed**: Sign-out bug — `/api/auth/logout` was shadowed by `/api/auth/:provider` (Express matched `:provider = "logout"`). Route moved above the parameterized route.

**Spotify (v2.1)**: Live Activity widget in the builder section of the home page. SSE streaming from `/api/spotify/stream` (server polls every 10s, pushes deltas). Widget shows album art with subtle glow, track name (marquee for long titles), artist, animated equalizer + progress bar, and a recently played / top tracks strip with tab toggle. Three states: Now Playing, Paused, Offline — never fully hides. Styled to match site card design (`var(--surface)`, `var(--border)`). A floating dismissible panel (`live-activity-panel.js`) shows the same track on every non-home route.

Next up: **Phase 2** — feature modules (todos, calendar, reminders, finance).

---

## Database Schema

```sql
-- Users: created on first OAuth login
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- e.g. "github:12345678"
  provider TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar TEXT,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'free',      -- 'admin' | 'subscriber' | 'free'
  stripe_customer_id TEXT,
  subscription_status TEXT,               -- 'active' | 'canceled' | 'past_due' | NULL
  subscription_tier TEXT,                 -- 'basic' | 'pro' | NULL
  tokens_used_month INTEGER DEFAULT 0,
  tokens_reset_at INTEGER,               -- unix timestamp for monthly reset
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS todos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 0,            -- 0=none 1=low 2=medium 3=high
  due_date TEXT,                         -- ISO date string (YYYY-MM-DD)
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
  start_at TEXT NOT NULL,               -- ISO datetime
  end_at TEXT,
  all_day INTEGER DEFAULT 0,
  recurrence TEXT,                      -- JSON blob: null or {type:'weekly',days:[1,3]}
  color TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS reminders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  remind_at TEXT NOT NULL,              -- ISO datetime
  repeat_cron TEXT,                     -- null = one-time
  delivered INTEGER DEFAULT 0,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS finance_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                   -- 'income' | 'expense'
  amount_cents INTEGER NOT NULL,        -- store as cents to avoid float errors
  category TEXT,
  description TEXT,
  entry_date TEXT NOT NULL,             -- ISO date string
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  model TEXT,
  context TEXT,                         -- 'general' | 'todos' | 'finance' | etc.
  created_at INTEGER DEFAULT (unixepoch())
);
```

---

## Phase 0: Foundation ✅ COMPLETE

- [x] **0.1** Install `better-sqlite3`, `connect-sqlite3` in `server/`
- [x] **0.2** Database init module (`server/db/db.js`) — opens `organizer.db`, runs schema at startup
- [x] **0.3** Switch session store from in-memory to `connect-sqlite3` (`sessions.db`)
- [x] **0.4** Open-auth flow — upsert user on every successful OAuth login, whitelist → admin promotion
- [x] **0.5** Auth middleware — `requireAuth`, `requireSubscriber`
- [x] **0.6** nginx — generalized `/api/*` proxy
- [x] **0.7** Post-login redirect → `/#/organizer`
- [x] **0.8** `GET /api/user/me` endpoint — returns full DB user record
- [x] **0.9** `GET /api/meta` endpoint — returns `devMode` flag + `frontendUrl`
- [x] **0.10** Dev login bypass — `POST /api/dev/login` (DEV_MODE only), button on login page

---

## Phase 1: Organizer Dashboard Shell ✅ COMPLETE

- [x] **1.1** New frontend route `#/organizer` — auth-gated, sidebar + tab layout
- [x] **1.2** ~~`#/status` admin-only Pi stats page~~ (removed — didn't fit direction)
- [x] **1.3** User profile header — avatar, name, tier badge, token usage bar with reset date
- [x] **1.4** Tab system — Todos, Calendar, Reminders, Finance, AI Chat (placeholder content)
- [x] **1.5** Organizer CSS — full responsive layout (920px collapse, 600px mobile)
- [x] **1.6** Dev banner — slim dark bar, shows when `devMode: true`

---

## Phase 2: Core Organizer Features 🔨 NEXT

Build each tool as a pair of backend CRUD routes + frontend render function.
**Pattern for every tool**: `GET /api/organizer/:tool`, `POST`, `PATCH /:id`, `DELETE /:id` — all behind `requireAuth`. Response: `{ ok: true, data: [...] }`.

### 2.1 — Todos

- [ ] Backend routes: list, create, update (title, description, priority, due_date, completed, list_name, sort_order), delete
- [ ] Frontend: list view grouped by `list_name`, priority + due-date pill styling, overdue highlighting
- [ ] Drag-to-reorder (update `sort_order` on drop)
- [ ] "New list" creation inline

### 2.2 — Calendar

- [ ] Backend routes: list events, create, update, delete
- [ ] Frontend: load FullCalendar via CDN dynamically (`import()` only when tab opens)
- [ ] Modal for create/edit — title, start/end, all-day toggle, color picker
- [ ] `eventDrop` → PATCH to update `start_at`/`end_at`

### 2.3 — Reminders

- [ ] Backend routes: list, create, update, delete + `GET /api/organizer/reminders/pending`
- [ ] `node-cron` job (every minute) — marks past-due reminders as `delivered`
- [ ] Frontend: on organizer load, fetch pending and show toast per undelivered reminder
- [ ] Repeat cron string support (UI: daily, weekly, custom)

### 2.4 — Finance Tracker

- [ ] Backend routes: list entries, create, update, delete + `GET /api/organizer/finance/summary`
- [ ] Store amounts as cents (`amount_cents`). Summary endpoint calculates totals server-side.
- [ ] Frontend: inline add form (dollars input → multiply ×100 before POST)
- [ ] Chart.js via CDN: doughnut (expense categories), bar (6-month income vs. expense)

---

## Phase 3: Claude AI Integration 📋 PLANNED

**Key principle**: API key lives server-side only. Client never sees it. Server enforces per-user token budgets before forwarding to Anthropic.

### Token limits by tier

| Tier | Limit/month | API cost estimate |
|---|---|---|
| Free | 0 (no AI access) | — |
| Basic ($5/mo) | 200,000 tokens | ~$0.80–$1.20 |
| Pro ($15/mo) | 1,000,000 tokens | ~$4–$6 |
| Admin | ∞ | — |

### Checklist

- [ ] Install `@anthropic-ai/sdk` in `server/`
- [ ] `checkAndConsumeTokens(userId, estimate)` — checks `tokens_used_month` vs tier limit, resets if past `tokens_reset_at`
- [ ] `POST /api/ai/chat` — `requireAuth` + `requireSubscriber`, builds context-aware system prompt, streams SSE response, records actual usage in `ai_usage`
- [ ] `buildSystemPrompt(userId, context)` — fetches relevant DB data (todos/events/finance/reminders) and injects concise summary
- [ ] Frontend chat panel — SSE stream via `fetch` + `ReadableStream`, token usage bar in header, context selector dropdown
- [ ] Upgrade prompt for free users accessing AI Chat tab
- [ ] Model: `claude-sonnet-4-6` default; consider `claude-haiku-4-5` for lightweight ops

---

## Phase 4: Stripe Billing 📋 PLANNED

- [ ] Create two Stripe products: Basic ($5/mo), Pro ($15/mo)
- [ ] Add `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` to `.env`
- [ ] `POST /api/stripe/create-checkout` — creates Stripe Checkout session, returns URL
- [ ] `POST /api/stripe/webhook` — verifies signature, handles `checkout.session.completed` + `invoice.paid` → updates `role`, `subscription_status`, `subscription_tier`
- [ ] nginx: special block for `/api/stripe/webhook` with `proxy_request_buffering off`
- [ ] `POST /api/stripe/portal` — creates Stripe Customer Portal session
- [ ] Frontend upgrade prompts — free tier paywall on AI Chat, red usage meter at limit

---

## Phase 5: Polish & Production Hardening 📋 PLANNED

- [ ] Data export: todos as JSON/CSV, finance as CSV, calendar as ICS
- [ ] Nightly DB backup: systemd timer copying `organizer.db` to `/srv/backup/organizer/organizer-YYYY-MM-DD.db`, keep last 30 days
- [ ] Email reminders: Nodemailer + Resend/Brevo SMTP relay
- [ ] Web push notifications: VAPID keys, service worker, push subscriptions in DB
- [ ] Admin panel (`#/admin`): user list, subscription status, usage, manual role management
- [ ] `express-rate-limit` on AI endpoint — 60 req/hr per IP as backstop
- [x] ~~Decide the fate of `#/status`~~ — **Deleted.** See `docs/IDEAS.md` for the resolved decision.

---

## Recommended Commit Order

1. `feat/todos` — Phase 2.1
2. `feat/calendar` — Phase 2.2
3. `feat/reminders` — Phase 2.3
4. `feat/finance` — Phase 2.4
5. `feat/ai-chat` — Phase 3 (grant yourself `subscriber` role in DB for local testing)
6. `feat/stripe` — Phase 4 (test with Stripe test mode + `stripe listen --forward-to localhost:4000/api/stripe/webhook`)
7. Polish, export, backups — ongoing

---

## Tech Stack Additions

| Addition | Purpose | Status |
|---|---|---|
| `better-sqlite3` | Database | ✅ Installed |
| `connect-sqlite3` | SQLite-backed sessions | ✅ Installed |
| `@anthropic-ai/sdk` | Claude API client | Phase 3 |
| `stripe` | Payment processing | Phase 4 |
| `node-cron` | Reminder background job | Phase 2.3 |
| Chart.js (CDN) | Finance charts | Phase 2.4 |
| FullCalendar (CDN) | Calendar grid UI | Phase 2.2 |

CDN libraries load dynamically only when the relevant tab opens — no bundle bloat.

---

## Cost Estimates

- `claude-sonnet-4-6`: $3/MTok input, $15/MTok output (verify current pricing at console.anthropic.com).
- Typical message: ~500 input + ~300 output tokens ≈ $0.006/message.
- Basic subscriber (200K tokens/mo): costs ~$0.80–$1.20. You charge $5. Margin is solid.
- Pro subscriber (1M tokens/mo): costs ~$4–$6. You charge $15. Still healthy.
- Monitor Anthropic console monthly and adjust limits if needed.

---

## Raspberry Pi 4 Capacity

The Pi 4 handles this at small scale (tens of concurrent users) without issue. AI requests are outbound HTTP calls to Anthropic — the Pi doesn't do inference. SQLite is more than fast enough for this read-heavy single-file workload. The main bottleneck would be network bandwidth during simultaneous AI streams, but Cloudflare Tunnel handles TLS and compression so CPU load stays low.
