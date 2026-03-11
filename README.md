# AnniWebsite

Personal website for **KoiNoYume7** — project showcase, devlog, status dashboard, and OAuth-protected dev tools.  
Live at [yumehana.dev](https://yumehana.dev) · Self-hosted on Raspberry Pi 4.

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + Vanilla JS, no framework |
| Backend | Node.js + Express |
| Auth | OAuth (GitHub, Discord, Google) |
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
│   │   ├── pages/           # home, about, projects, blog, contact, login, status
│   │   ├── posts/           # markdown blog posts
│   │   ├── styles/          # global.css, components.css
│   │   └── main.js          # router, starfield, cursor, easter eggs
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                  # OAuth backend (Express)
│   ├── server.js
│   ├── package.json
│   ├── .env.example         # copy to .env and fill in secrets
│   ├── anni-website.service # systemd service file
│   └── SETUP.md             # full OAuth setup guide
├── nginx/
│   └── yumehana.dev.nginx   # nginx site config
├── docs/
│   └── AI_INSTRUCTIONS.md   # comprehensive instructions for AI/coding assistants
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
| `#/status` | Live system dashboard | 🔒 Auth only |
| `#/anni` | Secret page 🌸 | Hidden |

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
npm run dev        # http://localhost:3000

# Backend (separate terminal)
cd server
npm install
cp .env.example .env
# fill in SESSION_SECRET at minimum
node server.js     # http://127.0.0.1:4000
```

Vite proxies `/api/*` to `:4000` automatically in dev mode.

For deeper architecture + operational notes, see `docs/AI_INSTRUCTIONS.md`.

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

See `server/SETUP.md` for full OAuth app creation guide and nginx/Cloudflare setup.

---

## Infrastructure

```
Browser
  └── Cloudflare Tunnel (HTTPS)
        └── nginx :80
              ├── /          → /srv/storage/AnniWebsite/ (static files)
              └── /api/*     → 127.0.0.1:4000 (Express backend)
                                    └── OAuth providers
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

*Built late at night with Monster Energy and questionable commit timestamps.*  
*© 2026 KoiNoYume7*