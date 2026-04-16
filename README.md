# AnniWebsite

Personal website + AI life organizer for **KoiNoYume7**.
Live at [yumehana.dev](https://yumehana.dev) · Self-hosted.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + Vanilla JS (SPA, no framework) |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| Auth | OAuth (GitHub, Discord, Google) — open registration, role-based |
| Reverse proxy | nginx |
| Tunnel | Cloudflare Tunnel (no open inbound ports) |
| Code + static | SD card at `/opt/anni/{www,server}` (always available) |
| User data | `organizer.db` on external drive at `/srv/storage` (hot-pluggable) |
| VPN | Tailscale (SSH + Samba access only) |

---

## Repo structure

```
AnniWebsite/
├── client/                        # Frontend (Vite)
│   ├── index.html
│   ├── public/
│   └── src/
│       ├── main.js                # Thin entry — wires lib/, effects/, pages/
│       ├── data/                  # Compiled content (gitignored, built by scripts/)
│       ├── lib/                   # Pure logic modules
│       │   ├── router.js          # Hash-based SPA router
│       │   ├── toast.js           # showToast utility
│       │   ├── theme.js           # Dark/light theme
│       │   └── meta.js            # /api/meta + dev banner
│       ├── effects/               # Visual DOM effects
│       │   ├── starfield.js       # Parallax starfield canvas
│       │   ├── cursor.js          # Custom cursor + ring
│       │   └── easter-eggs.js     # Konami code, logo ×7, /anni route
│       ├── components/            # Shared UI
│       │   ├── nav.js
│       │   └── footer.js
│       ├── pages/                 # Site pages (one file per route)
│       │   ├── home.js            # Organizer-first hero + featured projects
│       │   ├── about.js           # Reads from data/about.json
│       │   ├── projects.js        # Reads from data/projects.json
│       │   ├── blog.js            # Reads from data/devlogs.json
│       │   ├── contact.js         # Posts to /api/contact
│       │   └── login.js
│       ├── organizer/             # Self-contained organizer module
│       │   ├── index.js           # Entry point — auth check + shell render
│       │   ├── lib/
│       │   │   ├── api.js         # All organizer fetch calls
│       │   │   └── tier.js        # TAB_CONFIG, TIER_LIMITS, helpers
│       │   ├── components/
│       │   │   └── sidebar.js     # Sidebar HTML builder
│       │   └── tabs/              # One file per tab — drop new ones in here
│       │       ├── todos.js
│       │       ├── calendar.js
│       │       ├── reminders.js
│       │       ├── finance.js
│       │       └── ai-chat.js
│       └── styles/
│           ├── global.css         # Tokens, reset, animations, dev banner
│           ├── components.css     # Shared: buttons, cards, nav, footer, forms
│           ├── organizer.css      # All organizer-specific styles
│           └── pages/             # Page-specific responsive rules
│               ├── home.css
│               ├── about.css
│               └── contact.css
├── content/                       # Source content (edit these)
│   ├── projects.json              # Project metadata + featured flags
│   ├── about.json                 # Bio, skills, facts for the about page
│   └── devlogs/                   # Devlog posts
│       ├── config.json            # Devlog metadata (title, tags, sorting)
│       └── *.md                   # One markdown file per post
├── scripts/                       # Content compilers
│   ├── fetch-repos.js             # Fetches GitHub repos → merges with projects.json
│   ├── compile-devlogs.js         # Compiles markdown posts → devlogs.json
│   ├── compile-about.js           # Compiles about.json → client data
│   └── compile-all.js             # Runs all compilers in sequence
├── server/                        # Express backend
│   ├── server.js                  # Setup, middleware, auth routes, /api/contact
│   ├── db/
│   │   ├── db.js                  # SQLite singleton (WAL + FK)
│   │   └── schema.sql             # Full schema
│   ├── routes/                    # Route modules — drop Phase 2+ here
│   │   └── user.js                # /api/user/*
│   ├── .env.example
│   ├── anni-website.service       # systemd unit
│   └── SETUP.md
├── nginx/
│   └── yumehana.dev.nginx
├── docs/
│   ├── AI_INSTRUCTIONS.md         # Instructions for AI/coding assistants
│   ├── TODO.md                    # Organizer roadmap + phase tracker
│   └── IDEAS.md                   # Unstructured future ideas
├── deploy.sh
├── deploy.ps1
└── README.md
```

---

## Content system

All page content is **data-driven**. You edit files in `content/`, run the compilers, and the site picks up the changes.

| Content | Source file | Compiler | Output |
|---|---|---|---|
| Projects | `content/projects.json` | `scripts/fetch-repos.js` | `client/src/data/projects.json` |
| About me | `content/about.json` | `scripts/compile-about.js` | `client/src/data/about.json` |
| Devlogs | `content/devlogs/*.md` + `config.json` | `scripts/compile-devlogs.js` | `client/src/data/devlogs.json` |

```bash
node scripts/compile-all.js   # runs all three compilers
```

The `client/src/data/` directory is gitignored — it's always regenerated from source.

### Adding a new devlog

1. Create `content/devlogs/your-slug.md` with the post body
2. Add an entry to `content/devlogs/config.json` with title, date, tags, sorting
3. Run `node scripts/compile-devlogs.js`

### Editing projects

1. Edit `content/projects.json` — set `featured`, `icon`, `description`, `phase`, `sort_order`
2. Run `node scripts/fetch-repos.js` — fetches live GitHub data and merges with your config
3. Projects with `"featured": true` show on the home page; the rest appear under "Show all" on `#/projects`

### Editing the about page

1. Edit `content/about.json` — bio paragraphs, skills, facts, infrastructure, learning
2. Run `node scripts/compile-about.js`

---

## Pages

| Route | Description | Access |
|---|---|---|
| `#/` | Organizer-first hero, feature grid, featured projects | Public |
| `#/about` | Bio, skills, fun facts (data-driven) | Public |
| `#/projects` | Featured + all projects (data-driven) | Public |
| `#/blog` | Devlog with markdown posts (data-driven) | Public |
| `#/contact` | Contact form → server → Discord webhook | Public |
| `#/login` | OAuth login (GitHub / Discord / Google) | Public |
| `#/organizer` | AI life organizer dashboard | Auth required |
| `#/anni` | Secret page | Hidden |

---

## Organizer

The Organizer is the main product — a self-hosted personal life OS.

| Phase | Feature | Status |
|---|---|---|
| 0 | Database, open-auth, SQLite sessions, nginx `/api/*` | ✅ Done |
| 1 | Organizer shell — sidebar, tabs, user profile, token bar | ✅ Done |
| 2 | Todos, Calendar, Reminders, Finance tracker | 🔨 Next |
| 3 | Claude AI — streaming chat, context injection, token budgets | 📋 Planned |
| 4 | Stripe — Basic ($5/mo / 200K tokens), Pro ($15/mo / 1M tokens) | 📋 Planned |
| 5 | Data export, web push, email reminders, admin panel | 📋 Planned |

See `docs/TODO.md` for full implementation detail.

### Adding a new organizer tab (Phase 2+)

1. Create `client/src/organizer/tabs/your-tab.js` — export `render(user)` returning HTML
2. Register it in `client/src/organizer/index.js` → `TAB_RENDERERS`
3. Add the entry to `TAB_CONFIG` in `client/src/organizer/lib/tier.js`
4. Create backend routes in `server/routes/organizer/your-tab.js`, register in `server.js`

No other files need to change.

---

## Easter eggs

- **Konami code** `↑↑↓↓←→←→BA` — late night mode overlay
- **Logo click ×7** — navigates to secret `#/anni` page
- Custom cursor with lag ring + hover expand
- Animated starfield with parallax scroll, mouse drift, and shooting stars

---

## Dev setup

```bash
# Compile content (first time, or after editing content/)
node scripts/compile-all.js

# Frontend
cd client && npm install && npm run dev
# → http://localhost:3000 (proxies /api/* to :4000)

# Backend (separate terminal)
cd server && npm install
cp .env.example .env   # set SESSION_SECRET + DEV_MODE=true
node server.js         # → http://127.0.0.1:4000
```

### Dev login (bypass OAuth locally)

OAuth callback URLs point to the production domain. On localhost, use dev login instead:

1. Set `DEV_MODE=true` in `server/.env`
2. Go to `#/login` — a **Dev Login** button appears
3. Click → `POST /api/dev/login` → admin session → redirected to `#/organizer`

---

## Deploy

```bash
./deploy.sh    # Linux/macOS — rsync + systemctl restart
./deploy.ps1   # Windows — ssh/scp
```

Deploy scripts push code to `/opt/anni/` and preserve `server/.env`
and `server/db/*.db` (both the local `sessions.db` and the symlinked
`organizer.db`). See `server/SETUP.md` for full OAuth + nginx +
directory-layout setup.

---

## Infrastructure

```
Browser
  └── Cloudflare Tunnel (HTTPS)
        └── nginx :80
              ├── /         → /opt/anni/www/ (static, SD card)
              └── /api/*    → 127.0.0.1:4000 (Express, /opt/anni/server)
                                  └── db/organizer.db ──► /srv/storage/…
```

- Code lives on the SD card under `/opt/anni/{www,server}` so
  the site stays up even if the external storage drive is unplugged.
- The organizer database (`organizer.db`) is the only user data that
  lives on `/srv/storage` — symlinked into `server/db/` so `db.js`
  opens it transparently. When the drive is missing the backend
  serves a degraded organizer ("under maintenance") while login, home,
  blog, and projects keep working.
- Backend binds loopback only (`127.0.0.1:4000`) — never directly exposed
- SSH + Samba via Tailscale only; UFW blocks all other inbound

---

## Contributors & friends

- **KoiNoYume7** — author, design/dev, hosting
- **[SpizzyCoder](https://github.com/SpizzyCoder)** — contributor and good friend, thanks for all the help <3

---

*Built late at night with Monster Energy and questionable commit timestamps.*
© 2026 KoiNoYume7
