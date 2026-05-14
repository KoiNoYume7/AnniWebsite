# AnniWebsite

Personal website for **KoiNoYume7**.
Live at [yumehana.dev](https://yumehana.dev) · Self-hosted on a Raspberry Pi 4.

Part of the **YUME** ecosystem — auth is handled by [AnniCore](../AnniCore) at `auth.yumehana.dev`.

---

## What this is

A personal site. Blog, projects, contact form, live Spotify "Now Playing", and a SC loot tracker API.

The organizer (todos, calendar, reminders, finance) that used to live here has been migrated to **ALOS** (`alos.yumehana.dev`). The `#/organizer` route is preserved for backwards compat but the organizer module is deprecated in this repo — ALOS is the home for all life OS features going forward.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + Vanilla JS (SPA, no framework) |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` (SC data only) |
| Auth | Delegated to **AnniCore** (`auth.yumehana.dev`, port 4200) |
| Reverse proxy | nginx |
| Tunnel | Cloudflare Tunnel (no open inbound ports) |
| Pi paths | `/opt/anni/website` (backend) · `/opt/anni/website-www` (frontend) |

---

## Repo structure

```
AnniWebsite/
├── client/                        # Frontend (Vite)
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.js                # Entry — wires lib/, effects/, pages/
│       ├── data/                  # Compiled content (gitignored, built by scripts/)
│       ├── lib/                   # Pure logic modules
│       │   ├── router.js          # Hash-based SPA router
│       │   ├── toast.js
│       │   ├── theme.js
│       │   └── meta.js            # /api/meta + dev banner
│       ├── effects/               # Visual DOM effects
│       │   ├── starfield.js       # Parallax starfield canvas
│       │   ├── cursor.js          # Custom cursor
│       │   └── easter-eggs.js     # Konami code, logo ×7, /anni route
│       ├── components/            # Shared UI
│       │   ├── nav.js
│       │   ├── footer.js
│       │   ├── spotify-widget.js
│       │   └── live-activity-panel.js
│       ├── pages/                 # One file per route
│       │   ├── home.js
│       │   ├── about.js
│       │   ├── projects.js
│       │   ├── blog.js            # Reads from data/devlogs.json
│       │   ├── contact.js
│       │   └── login.js
│       ├── organizer/             # ⚠️ Deprecated — migrated to ALOS
│       └── styles/
│           ├── global.css
│           ├── components.css
│           ├── organizer.css      # Legacy — will be removed with organizer
│           └── pages/
├── content/                       # Source content (edit these, then compile)
│   ├── projects.json
│   ├── about.json
│   └── devlogs/
│       ├── config.json            # Metadata + sort order for all posts
│       └── *.md                   # One markdown file per post
├── scripts/                       # Content compilers (run before build)
│   ├── compile-all.js             # Runs all compilers in sequence
│   ├── compile-devlogs.js         # markdown + config → devlogs.json
│   ├── compile-about.js           # about.json → client data
│   └── fetch-repos.js             # GitHub API → projects.json
├── server/
│   ├── server.js
│   ├── db/
│   │   ├── db.js
│   │   └── schema.sql
│   ├── routes/
│   │   ├── spotify.js
│   │   └── sc.js                  # /api/sc/* — SC loot tracker
│   ├── .env.example
│   └── anni-website.service
├── nginx/
│   └── yumehana.dev.nginx
├── lib/                           # AnniLog PS module
├── docs/
│   ├── IDEAS.md
│   └── TODO.md
├── deploy.bat                     # ← entry point
├── deploy.ps1
├── deploy.sh
└── README.md
```

---

## Pages & routes

| Route | Description | Access |
|---|---|---|
| `#/` | Builder intro, SC Tools, Spotify, featured projects | Public |
| `#/about` | Bio, skills, facts | Public |
| `#/projects` | All projects (data-driven from GitHub + config) | Public |
| `#/blog` | Devlog (markdown posts, newest first) | Public |
| `#/contact` | Contact form → Discord webhook | Public |
| `#/login` | Redirects to `auth.yumehana.dev` OAuth | Public |
| `#/organizer` | ⚠️ Deprecated — redirects to `alos.yumehana.dev` | Auth |
| `#/anni` | Secret page | Hidden |

---

## Content system

All page content is data-driven. Edit files in `content/`, run the compile script, deploy.

```bash
node scripts/compile-all.js   # always run before build/deploy
```

| Content | Edit | Compile | Output |
|---|---|---|---|
| Projects | `content/projects.json` | `fetch-repos.js` | `client/src/data/projects.json` |
| About | `content/about.json` | `compile-about.js` | `client/src/data/about.json` |
| Devlogs | `content/devlogs/*.md` + `config.json` | `compile-devlogs.js` | `client/src/data/devlogs.json` |

### Adding a devlog

1. Create `content/devlogs/your-slug.md`
2. Add entry to `content/devlogs/config.json`
3. `node scripts/compile-devlogs.js` (or `compile-all.js`)
4. `.\deploy.bat -ClientOnly`

---

## Dev setup

```bash
# Compile content first
node scripts/compile-all.js

# Frontend
cd client && npm install && npm run dev
# → http://localhost:3000 (proxies /api/* to :4000)

# Backend (separate terminal)
cd server && npm install
cp .env.example .env
# Set ANNI_CORE_URL + AUTH_PUBLIC_URL + DEV_MODE=true
node server.js
```

---

## Deploy

```powershell
.\deploy.bat               # full deploy
.\deploy.bat -ClientOnly   # frontend only (compile → build → push)
.\deploy.bat -ServerOnly   # backend only
```

The compile step runs automatically before every client build. Preserves `.env` and `sc.db` on the Pi.

---

## Spotify integration

SSE-based live "Now Playing" in the home builder section. Server polls Spotify every 10s, pushes to all connected browsers. Three states: Now Playing, Paused, Offline. Also shows recent + top tracks. Floating panel on non-home routes.

One-time setup: visit `/api/spotify/auth` as admin to authorize. Refresh token is saved to `.env`.

---

## SC Tools API

The SC tools frontend (`sc.yumehana.dev`) lives in the `AnniSCTools` repo. AnniWebsite provides the **backend API** for SC data at `/api/sc/*` — loot tracker inventory and groups. Auth via AnniCore session.

---

## Infrastructure

```
Browser → Cloudflare Tunnel → nginx :80
  ├── yumehana.dev → /opt/anni/website-www/ + proxy /api/* → :4000
  └── auth.yumehana.dev → AnniCore :4200
```

Full infra reference: [`AnniCore/INFRA.md`](../AnniCore/INFRA.md)
Structure standard: [`AnniCore/docs/STRUCTURE.md`](../AnniCore/docs/STRUCTURE.md)

---

*Built late at night with Monster Energy and questionable commit timestamps.*
