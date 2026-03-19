---
description: AI instructions for working on AnniWebsite safely and effectively
---

# AnniWebsite — AI Instructions

## Project summary

AnniWebsite is a self-hosted personal website + AI life organizer for KoiNoYume7.

- Frontend: Vite + vanilla JS SPA (hash-router, no framework)
- Backend: Node.js + Express with OAuth + SQLite database
- Stats API: Python `http.server` JSON API for the status dashboard
- Reverse proxy: nginx
- Hosting: Raspberry Pi 4 (storage under `/srv/storage`, logs/backups under `/srv/backup`)

Primary domain: `https://yumehana.dev`

## Current development state (March 2026)

Phase 0 (foundation) and Phase 1 (organizer shell) are complete. The organizer is a real feature, not a placeholder — it has a live SQLite database, open-registration OAuth, persistent sessions, and a full dashboard UI. Phase 2 (feature modules: todos, calendar, reminders, finance) is next.

See `docs/TODO.md` for the full roadmap.

## Repo layout (authoritative)

- `client/`
  - Vite app
  - `src/main.js` — SPA entry, router, starfield, cursor, dev banner, easter eggs
  - `src/pages/*` — route modules (home, about, projects, blog, contact, login, status, organizer)
  - `src/components/*` — shared UI (nav.js, footer.js)
  - `src/posts/*` — markdown posts (loaded by the blog page)
  - `src/styles/global.css` — design tokens, reset, dev banner, starfield, animations
  - `src/styles/components.css` — buttons, cards, nav, footer, organizer layout
  - Output build: `client/dist/`
- `server/`
  - `server.js` — Express server: OAuth, sessions, `/api/user/me`, `/api/meta`, `/api/health`, dev login
  - `db/db.js` — SQLite init (WAL mode, FK constraints), exports `db` singleton
  - `db/schema.sql` — full schema: users, todos, events, reminders, finance_entries, ai_usage
  - `db/organizer.db` — live database (not committed)
  - `db/sessions.db` — session store (not committed)
  - `anni-website.service` — systemd unit (paths are Pi-specific)
  - `.env.example` — OAuth, session, and feature flag config template
  - `SETUP.md` — OAuth app setup notes
- `stats/`
  - `stats.py` — lightweight JSON stats API on port 5000
  - `anni-stats.service` — systemd unit
- `nginx/`
  - `yumehana.dev.nginx` — nginx site config
- `deploy.ps1` — Windows deploy script
- `deploy.sh` — Unix deploy script
- `docs/TODO.md` — organizer development roadmap + phase tracker

## Runtime architecture (production)

Request flow:

1. Browser → Cloudflare Tunnel (HTTPS)
2. Tunnel → nginx `:80`
3. nginx serves static frontend from `/srv/storage/AnniWebsite`
4. nginx proxies:
   - `/api/stats` → `127.0.0.1:5000` (Python stats — explicit block, higher priority)
   - `/api/*` → `127.0.0.1:4000` (Node/Express — catch-all)

Important invariants:

- Backend binds loopback only: `127.0.0.1:4000`
- Stats binds loopback only: `127.0.0.1:5000`
- Public exposure is only through nginx/Cloudflare Tunnel
- `/api/stripe/webhook` will need a special nginx block with `proxy_request_buffering off` (Phase 4)

## Key endpoints

Backend (Node/Express):

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/auth/me` | Public | Returns session user or 401 |
| `GET /api/user/me` | Required | Returns full DB user record |
| `GET /api/auth/:provider` | Public | Start OAuth flow (github/discord/google) |
| `GET /api/auth/callback/:provider` | Public | OAuth callback — upsert user, set session, redirect to `/#/organizer` |
| `GET /api/auth/logout` | Public | Destroy session |
| `GET /api/health` | Public | Health check + uptime |
| `GET /api/meta` | Public | Returns `{ devMode, frontendUrl }` |
| `POST /api/dev/login` | Public (DEV_MODE only) | Create dev session — body: `{ name, email, role }` |

Stats (Python):

- `GET /api/stats` → aggregated stats JSON
- `GET /api/stats/health` → simple health check

Frontend routes are hash-based (`#/...`). Successful OAuth login redirects to `/#/organizer`.

## Database

SQLite via `better-sqlite3`. File: `server/db/organizer.db`. WAL mode enabled, foreign keys enforced.

Tables:

| Table | Purpose |
|---|---|
| `users` | Created on first OAuth login. Roles: `free`, `subscriber`, `admin`. Stripe + token fields for Phase 3/4. |
| `todos` | User todos with priority, due date, list grouping, sort order. |
| `events` | Calendar events with start/end datetime, all-day flag, recurrence JSON, color. |
| `reminders` | Time-based reminders with optional repeat cron and `delivered` flag. |
| `finance_entries` | Income/expense ledger. Amounts stored as cents (integer) to avoid float drift. |
| `ai_usage` | Per-request Claude token logging (input + output, model, context). |

All timestamps are Unix epoch integers. Money is always cents.

## Auth model

- Any OAuth account (GitHub/Discord/Google) can sign in and gets `role: 'free'` by default.
- Env var whitelists (`GITHUB_ALLOWED_IDS`, `DISCORD_ALLOWED_IDS`, `GOOGLE_ALLOWED_EMAILS`) promote specific accounts to `role: 'admin'` on login. These are no longer gatekeepers — just admin promoters.
- Middleware: `requireAuth` (session check), `requireSubscriber` (role must be `subscriber` or `admin`).

## Local development

### Frontend

From `client/`:

```bash
npm install
npm run dev   # http://localhost:5173
```

Vite proxies `/api/*` → `http://localhost:4000` automatically.

### Backend

From `server/`:

```bash
npm install
cp .env.example .env
# Fill in SESSION_SECRET at minimum
# Set DEV_MODE=true to enable dev login
node server.js   # or: npm run dev
```

Notes:

- Backend uses `FRONTEND_URL` for CORS. Set it to `http://localhost:5173` in `.env` for local dev.
- `trust proxy` is set — nginx sits in front in production.

### Dev login (OAuth bypass)

OAuth callback URLs are tied to the production domain (`yumehana.dev`). OAuth **will not work on localhost** without configuring separate dev OAuth apps.

**Use dev login instead:**

1. Set `DEV_MODE=true` in `server/.env`
2. Start the backend and frontend
3. Go to `#/login` — a "Dev Login" button appears below the OAuth buttons
4. Click it → calls `POST /api/dev/login` → creates an admin session → redirects to `#/organizer`

This is the intended local development flow for anything behind auth.

### Stats API

Runs via systemd on the Pi. Locally:

```bash
python stats.py
```

Reads `/proc/*` and systemd — on non-Linux hosts expect partial/empty values.

### Stats payload contract

`stats/stats.py` serves two endpoints:

- `GET /api/stats` → JSON with: `uptime`, `cpu_temp`, `cpu_load`, `cpu_usage` (per core), `memory`, `storage`, `network`, `services`, `fail2ban`, `logs`
- `GET /api/stats/health` → lightweight availability check

Update both `stats/stats.py` and `client/src/pages/status.js` together if adding/removing fields.

## Deployment

### Windows deploy (`deploy.ps1`)

Uses `ssh` + `scp`. Deploys:
- Frontend: `client/dist/*` → `${PI_WEB}`
- Backend: `server/*` → `${PI_SERVER}` (excludes `node_modules`, `.env`, `db/*.db`)

**SSH agent (Windows):**

```powershell
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
ssh-add $env:USERPROFILE\.ssh\id_ed25519
```

### Unix deploy (`deploy.sh`)

Uses `rsync`. Also restarts `anni-website` systemd service.

### systemd units

- `server/anni-website.service` — runs Node backend (paths must match deployed directory)
- `stats/anni-stats.service` — runs Python stats

Diagnose production issues with:

```bash
journalctl -u anni-website -n 50 --no-pager
journalctl -u anni-stats -n 50 --no-pager
```

## Nginx

`nginx/yumehana.dev.nginx`:

- Serves static root from `/srv/storage/AnniWebsite`
- Explicit `/api/stats` block → Python on `:5000`
- Catch-all `/api/` block → Node on `:4000` (covers all organizer + auth endpoints)

Rules:
- Always run `nginx -t` before reload.
- Keep `/api/stats` before `/api/` so the more specific location takes priority.
- Phase 4 will need a special `/api/stripe/webhook` block with `proxy_request_buffering off`.

## Secrets and safety rules

- Never commit `server/.env` — it contains OAuth secrets and session key.
- Never commit `server/db/*.db` files — they contain user data. `.gitignore` covers them.
- When editing auth logic: preserve cookie/session security (`httpOnly`, `secure`, `sameSite`).
- When editing deploy scripts: keep `.env` and `.db` files preserved on the Pi.

## Common pitfalls / gotchas

- PowerShell is case-insensitive: do not name functions `SSH`/`SCP` — they collide with the real binaries.
- Windows PowerShell can break on some non-ASCII characters depending on encoding.
- `systemctl is-active` output includes newlines — always `.Trim()` before comparing.
- `scp` globs are more reliable with forward slashes: `client/dist/*`.
- Money in `finance_entries` is **always cents** (integer). Never store floats.
- `tokens_reset_at` is a Unix timestamp — compare with `Date.now() / 1000`, not `new Date()`.

## When you (the AI) should ask before changing things

- OAuth provider settings / callback URLs
- Any path under `/srv/storage` or `/srv/backup`
- systemd unit changes that affect `User`, `WorkingDirectory`, or filesystem permissions
- Stripe webhook handling (raw body requirement is critical — don't add body parsers before it)

## Quick "where to look" map

| Thing | File |
|---|---|
| SPA routing / initialization | `client/src/main.js` |
| Organizer dashboard | `client/src/pages/organizer.js` |
| Status dashboard frontend | `client/src/pages/status.js` |
| Login + dev login UI | `client/src/pages/login.js` |
| Design tokens + animations | `client/src/styles/global.css` |
| Component styles + organizer layout | `client/src/styles/components.css` |
| OAuth + sessions + API routes | `server/server.js` |
| Database init + singleton | `server/db/db.js` |
| Full DB schema | `server/db/schema.sql` |
| Stats API implementation | `stats/stats.py` |
| Reverse proxy rules | `nginx/yumehana.dev.nginx` |
| Deployment automation | `deploy.ps1`, `deploy.sh` |
