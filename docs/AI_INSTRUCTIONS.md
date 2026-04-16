---
description: AI instructions for working on AnniWebsite safely and effectively
---

# AnniWebsite — AI Instructions

## Project summary

AnniWebsite is a self-hosted personal website + AI life organizer for KoiNoYume7.

- Frontend: Vite + vanilla JS SPA (hash-router, no framework)
- Backend: Node.js + Express with OAuth + SQLite
- Content: data-driven — all page content lives in `content/` and is compiled by `scripts/` into `client/src/data/`
- Reverse proxy: nginx
- Hosting: code + static under `/opt/anni/{www,server}` on the SD card; `organizer.db` on the `/srv/storage` external drive (hot-pluggable). `/srv/backup` is a separate backup drive and is not required for the site to run.

Primary domain: `https://yumehana.dev`

## Development state (April 2026)

Phase 0 (foundation) and Phase 1 (organizer shell) are complete. Phase 2 (feature modules) is next.
The organizer is the main product — it's a real feature with a live SQLite DB and full auth.

The Pi dashboard (`#/status`) and Python stats API have been **removed** — they didn't fit the site's direction.

The Discord server invite CTA is **disabled** (server not ready yet). The design is preserved but greyed out.

See `docs/TODO.md` for the full roadmap and phase tracker.

---

## Content system

All page content is **data-driven**. Source files live in `content/`, compilers in `scripts/`, output in `client/src/data/` (gitignored).

| Content | Source | Compiler | Output |
|---|---|---|---|
| Projects | `content/projects.json` | `scripts/fetch-repos.js` | `client/src/data/projects.json` |
| About | `content/about.json` | `scripts/compile-about.js` | `client/src/data/about.json` |
| Devlogs | `content/devlogs/*.md` + `config.json` | `scripts/compile-devlogs.js` | `client/src/data/devlogs.json` |

```bash
node scripts/compile-all.js   # runs all three
```

**After editing any `content/` file, re-run the relevant compiler before dev/build.**

---

## Repo layout (authoritative)

```
client/src/
  main.js                 ← Thin entry — imports and wires everything
  data/                   ← Compiled content (gitignored)
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
    home.js               ← Organizer-first hero, reads data/projects.json for featured
    about.js              ← Reads data/about.json
    projects.js           ← Reads data/projects.json, featured/all toggle
    blog.js               ← Reads data/devlogs.json
    contact.js            ← POSTs to /api/contact (server-side Discord webhook)
    login.js              ← OAuth + dev login
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
  styles/
    global.css            ← Design tokens, reset, starfield, cursor, dev banner, toast
    components.css        ← Shared: buttons, cards, nav, footer, forms, badges, spinner
    organizer.css         ← All .organizer-* classes
    pages/
      home.css            ← Home-specific responsive rules + feature card styles
      about.css           ← About-specific responsive rules
      contact.css         ← Contact-specific responsive rules

content/                  ← Source content (edit these, then compile)
  projects.json           ← Project metadata, icons, featured flags, sort order
  about.json              ← Bio, skills, facts, infrastructure, learning
  devlogs/
    config.json           ← Devlog metadata (title, subtitle, tags, sort order)
    *.md                  ← One markdown file per devlog post

scripts/                  ← Content compilers
  fetch-repos.js          ← Fetches GitHub repos → merges with projects.json → output
  compile-devlogs.js      ← Compiles markdown + config → devlogs.json
  compile-about.js        ← Compiles about.json → client data
  compile-all.js          ← Runs all compilers in sequence

server/
  server.js              ← Express setup, middleware, auth routes, /api/contact
  db/
    db.js                ← SQLite singleton (WAL + FK pragmas)
    schema.sql           ← Full schema
  routes/                ← Route modules — Phase 2+ goes here
    user.js              ← /api/user/me
  .env.example
  anni-website.service
  SETUP.md

nginx/
  yumehana.dev.nginx

docs/
  AI_INSTRUCTIONS.md     ← This file
  TODO.md                ← Organizer roadmap + phase tracker
  IDEAS.md               ← Unstructured future ideas
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
  ├── /         → /opt/anni/www/ (static files, SD card)
  └── /api/*    → 127.0.0.1:4000 (Node/Express, /opt/anni/server)
```

Pi directory layout:
- `/opt/anni/www` — built Vite output (always available)
- `/opt/anni/server` — Node/Express backend + `sessions.db`
- `/opt/anni/server/db/organizer.db` → **symlink** into `/srv/storage/AnniWebsite/server/db/organizer.db` (the only user data on the hot-pluggable drive)

Invariants:
- Backend binds loopback only: `127.0.0.1:4000`
- `X-Forwarded-Proto` comes from Cloudflare's header (`$http_x_forwarded_proto`), not `$scheme` — nginx is on plain `:80` so `$scheme` is always "http"
- `/api/stripe/webhook` (Phase 4) needs `proxy_request_buffering off` in nginx
- When `/srv/storage` is unplugged the backend must degrade gracefully: the organizer goes into "under maintenance" mode, but login/home/blog/projects keep serving

---

## Key endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/auth/me` | Public | Session user or 401 |
| `GET /api/user/me` | Required | Full DB user record (organizer uses this) |
| `GET /api/auth/:provider` | Public | Start OAuth (github/discord/google) |
| `GET /api/auth/callback/:provider` | Public | OAuth callback → upsert user → redirect `/#/organizer` |
| `GET /api/auth/logout` | Public | Destroy session + clear cookie |
| `GET /api/health` | Public | Health check + uptime |
| `GET /api/meta` | Public | `{ devMode, frontendUrl }` |
| `POST /api/contact` | Public | Contact form → Discord webhook (server-side) |
| `POST /api/dev/login` | Public (DEV_MODE only) | Create dev session; body: `{ name, email, role }` |
| `GET /api/spotify/now-playing` | Public | Current track or `{ playing: false }` |
| `GET /api/spotify/stream` | Public | SSE — pushes `now-playing` state on every change (~10s poll interval server-side) |
| `GET /api/spotify/recent-tracks` | Public | Recently played tracks (cached 3 min; `?limit=N`, max 50) |
| `GET /api/spotify/top-tracks` | Public | Top tracks (`?range=short_term\|medium_term\|long_term`) |
| `GET /api/spotify/auth` | Admin | One-time Spotify OAuth setup |
| `GET /api/spotify/callback` | Public | Spotify OAuth callback (writes refresh token to .env) |
| `GET /api/spotify/status` | Public | Config status (configured, hasRefreshToken) |

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

### Content compilation (do this first)

```bash
node scripts/compile-all.js
```

### Frontend

```bash
cd client && npm install && npm run dev
# Vite: http://localhost:3000, proxies /api/* → :4000
```

### Backend

```bash
cd server && npm install
cp .env.example .env   # fill SESSION_SECRET, set DEV_MODE=true
node server.js
```

Set `FRONTEND_URL_DEV=http://localhost:3000` for CORS in dev.

### Dev login (OAuth bypass)

OAuth redirects go to the production domain — they won't work on localhost.

**Workflow:** `DEV_MODE=true` → go to `#/login` → click **Dev Login** → admin session created via `POST /api/dev/login` → lands on `#/organizer`.

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
```

---

## Nginx

`nginx/yumehana.dev.nginx`:

- Static root: `/opt/anni/www`
- Logs: `/var/log/nginx/anni-{access,error}.log`
- `/api/` → Node :4000
- Sets `X-Forwarded-Proto $http_x_forwarded_proto` so cookies keep the `Secure` flag behind Cloudflare

Rules:
- Always `nginx -t` before reload
- Phase 4: add explicit `/api/stripe/webhook` block with `proxy_request_buffering off`

---

## Safety rules

- Never commit `server/.env` (OAuth secrets + session key)
- Never commit `server/db/*.db` (user data — covered by `.gitignore`)
- Never commit `client/src/data/` (compiled content — covered by `.gitignore`)
- Preserve `httpOnly`, `secure`, `sameSite` on session cookie
- Deploy scripts must preserve `.env` and `.db` files on Pi

---

## Common pitfalls

- PowerShell: don't name functions `SSH`/`SCP` — they shadow the real binaries
- `systemctl is-active` output has a trailing newline — always `.Trim()` before comparing
- Money in `finance_entries` is **cents** — never store or display as floats
- `tokens_reset_at` is Unix epoch (seconds) — compare with `Math.floor(Date.now() / 1000)`
- Content pages import from `../data/*.json` — if the data files are missing, run `node scripts/compile-all.js`
- **Route ordering in Express**: `/api/auth/logout` MUST be defined before `/api/auth/:provider`, otherwise `:provider` matches "logout" as a provider name and the logout route never fires. This was a real bug that broke sign-out for weeks.

---

## Ask before changing

- OAuth provider settings / callback URLs
- The `/opt/anni/server/db/organizer.db` ↔ `/srv/storage/...` symlink
- Any path under `/opt/anni/`, `/srv/storage`, or `/srv/backup`
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
| Spotify widget (home hero) | `client/src/components/spotify-widget.js` |
| Spotify floating side panel | `client/src/components/live-activity-panel.js` |
| Spotify routes | `server/routes/spotify.js` |
| Home page | `client/src/pages/home.js` |
| Login + dev login UI | `client/src/pages/login.js` |
| Design tokens | `client/src/styles/global.css` |
| Organizer styles | `client/src/styles/organizer.css` |
| Shared component styles | `client/src/styles/components.css` |
| OAuth + sessions | `server/server.js` |
| User API route | `server/routes/user.js` |
| DB init | `server/db/db.js` |
| Full schema | `server/db/schema.sql` |
| Nginx config | `nginx/yumehana.dev.nginx` |
| Deploy | `deploy.ps1`, `deploy.sh` |
| Project content | `content/projects.json` |
| About content | `content/about.json` |
| Devlog content | `content/devlogs/` |
| Content compilers | `scripts/` |
