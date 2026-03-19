# AnniWebsite

Personal website + AI life organizer for **KoiNoYume7** — project showcase, devlog, and OAuth-protected Organizer dashboard.
Live at [yumehana.dev](https://yumehana.dev) · Self-hosted on Raspberry Pi 4.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + Vanilla JS (SPA) |
| Backend | Node.js + Express |
| Database | SQLite via `better-sqlite3` |
| Auth | OAuth (GitHub, Discord, Google) — open registration, role-based |
| Reverse proxy | nginx |
| Tunnel | Cloudflare Tunnel (no open inbound ports) |
| Server | Raspberry Pi 4, Raspberry Pi OS Lite 64-bit |
| Storage | NTFS external drives at `/srv/storage` + `/srv/backup` |
| VPN | Tailscale (SSH + Samba access only) |

---

## Repo structure

```
AnniWebsite/
├── client/                  # Frontend (Vite)
│   ├── public/
│   ├── src/
│   │   ├── components/      # nav.js, footer.js
│   │   ├── pages/           # home, about, projects, blog, contact, login, status, organizer
│   │   ├── posts/           # markdown blog posts
│   │   ├── styles/          # global.css, components.css
│   │   └── main.js          # router, starfield, cursor, easter eggs
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                  # OAuth + Organizer backend (Express)
│   ├── server.js
│   ├── db/
│   │   ├── db.js            # SQLite init, WAL + FK pragmas
│   │   └── schema.sql       # full schema (users, todos, events, reminders, finance, ai_usage)
│   ├── package.json
│   ├── .env.example         # copy to .env and fill in secrets
│   ├── anni-website.service # systemd service file
│   └── SETUP.md             # full OAuth + server setup guide
├── stats/                   # Python status API (stats.py + systemd unit)
│   ├── stats.py
│   └── anni-stats.service
├── nginx/
│   └── yumehana.dev.nginx   # nginx site config
├── docs/
│   ├── AI_INSTRUCTIONS.md   # instructions for AI/coding assistants
│   └── TODO.md              # organizer development roadmap + phase tracker
├── deploy.sh                # rsync-based deploy helper (Unix/macOS)
├── deploy.ps1               # ssh/scp deploy helper (Windows)
├── .gitignore
└── README.md
```

---

## Pages

| Route | Description | Access |
|---|---|---|
| `#/` | Hero, projects teaser, about teaser, Discord CTA | Public |
| `#/about` | Bio, skills, fun facts | Public |
| `#/projects` | GitHub-fetched project cards | Public |
| `#/blog` | Devlog with markdown posts | Public |
| `#/contact` | Discord webhook contact form | Public |
| `#/login` | OAuth login (GitHub / Discord / Google) | Public |
| `#/organizer` | AI life organizer dashboard | Auth required |
| `#/status` | Live Pi system dashboard | Admin only |
| `#/anni` | Secret page | Hidden |

---

## Organizer

The Organizer is a self-hosted life OS built into the site. Phases:

| Phase | Feature | Status |
|---|---|---|
| 0 | Database, open-auth, SQLite sessions, nginx `/api/*` | ✅ Done |
| 1 | Organizer shell — sidebar, tabs, user profile, token bar | ✅ Done |
| 2 | Todos, Calendar (FullCalendar), Reminders, Finance tracker | 🔨 Next |
| 3 | Claude AI integration — streaming chat, context injection, per-user token budgets | 📋 Planned |
| 4 | Stripe billing — Basic ($5/mo / 200K tokens), Pro ($15/mo / 1M tokens) | 📋 Planned |
| 5 | Data export, web push, email reminders, admin panel, rate limiting | 📋 Planned |

See `docs/TODO.md` for full implementation detail.

---

## Easter eggs

- **Konami code** `↑↑↓↓←→←→BA` — activates late night mode overlay
- **Logo click ×7** — navigates to secret `#/anni` page
- Custom cursor with lag ring + hover expand
- Animated starfield with parallax scroll, mouse drift, and shooting stars

---

## Dev setup

```bash
# Frontend
cd client
npm install
npm run dev        # http://localhost:5173 (Vite proxies /api/* → :4000)

# Backend (separate terminal)
cd server
npm install
cp .env.example .env
# Fill in SESSION_SECRET at minimum; set DEV_MODE=true to enable dev login bypass
node server.js     # http://127.0.0.1:4000

# Optional: Stats API (for status page data when testing locally)
cd stats
python stats.py    # http://127.0.0.1:5000
```

### Dev login (bypass OAuth locally)

When `DEV_MODE=true` in `server/.env`, a **Dev Login** button appears on the login page. Clicking it calls `POST /api/dev/login` and creates an admin session without going through GitHub/Discord/Google. This is the intended way to develop and test the Organizer locally — OAuth callback URLs are tied to the production domain so real OAuth won't work on localhost.

---

## Deploy on Raspberry Pi

Use the deploy scripts from the repo root:

```bash
# Linux/macOS
./deploy.sh
```

```powershell
# Windows
./deploy.ps1
```

Notes:

- The Windows script uses `ssh`/`scp`. If your SSH key has a passphrase, use `ssh-agent` + `ssh-add` so you only type it once per session.
- The deploy scripts preserve `server/.env` on the Pi.

See `server/SETUP.md` for OAuth configuration and server setup details.

---

## Infrastructure

```
Browser
  └── Cloudflare Tunnel (HTTPS)
        └── nginx :80
              ├── /             → /srv/storage/AnniWebsite/ (static files)
              ├── /api/stats    → 127.0.0.1:5000 (Python stats API)
              └── /api/*        → 127.0.0.1:4000 (Express backend)
                                      ├── OAuth providers
                                      └── organizer.db (SQLite)
```

- SSH accessible via **Tailscale only** (no public exposure)
- Samba accessible via **Tailscale only**
- Backend listens on `127.0.0.1` loopback only — never directly exposed
- UFW: deny all inbound except Tailscale interface

### Stats API

The status dashboard reads from a small Python API on the Pi:

- Service: `anni-stats` (systemd)
- Port: `127.0.0.1:5000`
- nginx: proxied at `/api/stats`

---

## Projects featured

- **[AnniProxy](https://github.com/KoiNoYume7/AnniProxy)** — self-hosted proxy browser backend (WIP)
- **[AnniWebsite](https://github.com/KoiNoYume7/AnniWebsite)** — this site (WIP)

---

## Contributors & friends of the project

- **KoiNoYume7** — original author, design/dev, hosting
- **[SpizzyCoder](https://github.com/SpizzyCoder)** — contributor and good friend, thanks for all the help <3

---

*Built late at night with Monster Energy and questionable commit timestamps.*
© 2026 KoiNoYume7
