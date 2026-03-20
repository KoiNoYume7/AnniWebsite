---
description: AI instructions for working on AnniWebsite safely and effectively
---

# AnniWebsite — AI Instructions

## Project summary

AnniWebsite is a self-hosted personal website + AI life organizer for KoiNoYume7.

- Frontend: Vite + vanilla JS SPA (hash-router, no framework)
- Backend: Node.js + Express with OAuth + SQLite
- Stats API: Python `http.server` JSON API for the status dashboard
- Reverse proxy: nginx on Raspberry Pi 4
- Hosting: `/srv/storage` (web files), `/srv/backup` (backups)

Primary domain: `https://yumehana.dev`

## Development state (March 2026)

Phase 0 (foundation) and Phase 1 (organizer shell) are complete. Phase 2 (feature modules) is next.
The organizer is the main product — it's a real feature with a live SQLite DB and full auth.

See `docs/TODO.md` for the full roadmap and phase tracker.

---

## Repo layout (authoritative)

```
client/src/
  main.js                 ← Thin entry — imports and wires everything, ~30 lines
  lib/
    router.js             ← Hash router: routes map, navigate(), hashchange
    toast.js              ← showToast()
    theme.js              ← initTheme(), toggleTheme()
    meta.js               ← syncAppMeta(), injectDevBanner(), boots __APP_META_PROMISE
  effects/
    starfield.js          ← Parallax starfield canvas
    cursor.js             ← Custom cursor + trailing ring
    easter-eggs.js        ← Konami code, logo ×7, /anni route registration
  components/
    nav.js                ← Site navigation
    footer.js             ← Site footer
  pages/                  ← Site pages (one file = one route)
    home.js               ← Organizer-first hero; also exports prefetchGitHub()
    about.js
    projects.js
    blog.js
    contact.js
    login.js
    status.js             ← Admin-only Pi dashboard
    organizer.js          ← Stub re-export → ../organizer/index.js (file was relocated)
  organizer/              ← Self-contained — working on organizer = working in here
    index.js              ← Entry: auth check, shell render, tab switching
    lib/
      api.js              ← All organizer fetch calls (fetchUser, makeCRUD factory)
      tier.js             ← TAB_CONFIG, TIER_LIMITS, TIER_LABELS, helpers
    components/
      sidebar.js          ← buildSidebar(user) returns sidebar HTML string
    tabs/                 ← One file per tab — drop Phase 2+ files here
      todos.js            ← render(user) → HTML string
      calendar.js
      reminders.js
      finance.js
      ai-chat.js
  posts/                  ← Markdown blog posts
  styles/
    global.css            ← Design tokens, reset, starfield, cursor, dev banner, toast
    components.css        ← Shared: buttons, cards, nav, footer, forms, badges, spinner
    organizer.css         ← All .organizer-* classes
    pages/
      home.css            ← Home-specific responsive rules + feature card styles
      about.css           ← About-specific responsive rules
      contact.css         ← Contact-specific responsive rules

server/
  server.js              ← Express setup, middleware, auth routes (/api/auth/*)
  db/
    db.js                ← SQLite singleton (WAL + FK pragmas)
    schema.sql           ← Full schema
  routes/                ← Route modules — Phase 2+ goes here
    user.js              ← /api/user/me
  .env.example
  anni-website.service

stats/
  stats.py               ← Python stats API on :5000
  anni-stats.service

nginx/
  yumehana.dev.nginx

docs/
  AI_INSTRUCTIONS.md     ← This file
  TODO.md                ← Organizer roadmap + phase tracker
  IDEAS.md               ← Unstructured future ideas (Spotify, etc.)
```

---

## Adding a new organizer tab (the intended workflow for Phase 2)

1. Create `client/src/organizer/tabs/your-tab.js` — export `render(user)` returning an HTML string
2. Import and register it in `client/src/organizer/index.js` → `TAB_RENDERERS`
3. Add entry to `TAB_CONFIG` in `client/src/organizer/lib/tier.js`
4. Create `server/routes/organizer/your-tab.js` with CRUD routes, import in `server.js`

**No other files need to change.** This is the whole point of the isolation.

---

## Runtime architecture (production)

```
Browser → Cloudflare Tunnel (HTTPS) → nginx :80
  ├── /             → /srv/storage/AnniWebsite/ (static files)
  ├── /api/stats    → 127.0.0.1:5000 (Python — explicit block, higher priority)
  └── /api/*        → 127.0.0.1:4000 (Node/Express)
```

Invariants:
- Backend binds loopback only: `127.0.0.1:4000`
- Stats binds loopback only: `127.0.0.1:5000`
- `/api/stripe/webhook` (Phase 4) needs `proxy_request_buffering off` in nginx

---

## Key endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/auth/me` | Public | Session user or 401 |
| `GET /api/user/me` | Required | Full DB user record (organizer uses this) |
| `GET /api/auth/:provider` | Public | Start OAuth (github/discord/google) |
| `GET /api/auth/callback/:provider` | Public | OAuth callback → upsert user → redirect `/#/organizer` |
| `GET /api/auth/logout` | Public | Destroy session |
| `GET /api/health` | Public | Health check + uptime |
| `GET /api/meta` | Public | `{ devMode, frontendUrl }` |
| `POST /api/dev/login` | Public (DEV_MODE only) | Create dev session; body: `{ name, email, role }` |

---

## Database

SQLite via `better-sqlite3`. File: `server/db/organizer.db` (not committed). WAL mode, FK constraints enabled.

| Table | Purpose |
|---|---|
| `users` | Created on first OAuth login. Roles: `free`, `subscriber`, `admin`. Stripe + token fields for Phase 3/4. |
| `todos` | Priority lists with due dates and list grouping. Phase 2.1. |
| `events` | Calendar events. Phase 2.2. |
| `reminders` | Time-based reminders with cron repeat. Phase 2.3. |
| `finance_entries` | Income/expense ledger. Amounts as cents (integer). Phase 2.4. |
| `ai_usage` | Per-request Claude token logging. Phase 3. |

**Money is always stored as cents (integer). Never floats.**

---

## Auth model

- Any OAuth account gets `role: 'free'` on first login — open registration.
- Env var whitelists (`GITHUB_ALLOWED_IDS`, `DISCORD_ALLOWED_IDS`, `GOOGLE_ALLOWED_EMAILS`) promote to `role: 'admin'`.
- Middleware: `requireAuth` (session check), `requireSubscriber` (role must be `subscriber` or `admin`).

---

## Local development

### Frontend

```bash
cd client && npm install && npm run dev
# Vite: http://localhost:3000, proxies /api/* → :4000
```

### Backend

```bash
cd server && npm install
cp .env.example .env   # fill SESSION_SECRET, set DEV_MODE=true
node server.js         # or npm run dev
```

Set `FRONTEND_URL_DEV=http://localhost:3000` for CORS in dev.

### Dev login (OAuth bypass)

OAuth redirects go to the production domain — they won't work on localhost.

**Workflow:** `DEV_MODE=true` → go to `#/login` → click **Dev Login** → admin session created via `POST /api/dev/login` → lands on `#/organizer`.

### Stats API

```bash
python stats/stats.py
```

Reads `/proc/*` and systemd — partial/empty values on non-Linux.

---

## Stats payload contract

`GET /api/stats` → `uptime`, `cpu_temp`, `cpu_load`, `cpu_usage`, `memory`, `storage`, `network`, `services`, `fail2ban`, `logs`

Update both `stats/stats.py` and `client/src/pages/status.js` together if fields change.

---

## Deployment

### Windows (`deploy.ps1`)

Uses `ssh`/`scp`. SSH agent required for smooth deploys:
```powershell
Set-Service ssh-agent -StartupType Automatic && Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

### Unix (`deploy.sh`)

Uses `rsync`, restarts `anni-website` systemd service.

### Diagnose production

```bash
journalctl -u anni-website -n 50 --no-pager
journalctl -u anni-stats   -n 50 --no-pager
```

---

## Nginx

`nginx/yumehana.dev.nginx`:

- Static root: `/srv/storage/AnniWebsite`
- `/api/stats` (explicit, higher priority) → Python :5000
- `/api/` (catch-all) → Node :4000

Rules:
- Always `nginx -t` before reload
- Phase 4: add explicit `/api/stripe/webhook` block with `proxy_request_buffering off`

---

## Safety rules

- Never commit `server/.env` (OAuth secrets + session key)
- Never commit `server/db/*.db` (user data — covered by `.gitignore`)
- Preserve `httpOnly`, `secure`, `sameSite` on session cookie
- Deploy scripts must preserve `.env` and `.db` files on Pi

---

## Common pitfalls

- PowerShell: don't name functions `SSH`/`SCP` — they shadow the real binaries
- `systemctl is-active` output has a trailing newline — always `.Trim()` before comparing
- Money in `finance_entries` is **cents** — never store or display as floats
- `tokens_reset_at` is Unix epoch (seconds) — compare with `Math.floor(Date.now() / 1000)`

---

## Ask before changing

- OAuth provider settings / callback URLs
- Any path under `/srv/storage` or `/srv/backup`
- systemd unit `User`, `WorkingDirectory`, or filesystem permissions
- Stripe webhook handling (raw body requirement is critical)

---

## Quick "where to look" map

| Thing | File |
|---|---|
| App boot + wiring | `client/src/main.js` |
| Routing | `client/src/lib/router.js` |
| Organizer entry | `client/src/organizer/index.js` |
| Organizer tab content | `client/src/organizer/tabs/*.js` |
| Organizer API calls | `client/src/organizer/lib/api.js` |
| Tier / token config | `client/src/organizer/lib/tier.js` |
| Sidebar HTML | `client/src/organizer/components/sidebar.js` |
| Visual effects | `client/src/effects/` |
| Home page | `client/src/pages/home.js` |
| Login + dev login UI | `client/src/pages/login.js` |
| Design tokens | `client/src/styles/global.css` |
| Organizer styles | `client/src/styles/organizer.css` |
| Shared component styles | `client/src/styles/components.css` |
| OAuth + sessions | `server/server.js` |
| User API route | `server/routes/user.js` |
| DB init | `server/db/db.js` |
| Full schema | `server/db/schema.sql` |
| Stats API | `stats/stats.py` |
| Nginx config | `nginx/yumehana.dev.nginx` |
| Deploy | `deploy.ps1`, `deploy.sh` |
