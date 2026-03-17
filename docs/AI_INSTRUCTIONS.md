---
description: AI instructions for working on AnniWebsite safely and effectively
---

# AnniWebsite — AI Instructions

## Project summary

AnniWebsite is a self-hosted personal website for KoiNoYume7.

- Frontend: Vite + vanilla JS SPA (hash-router)
- Backend: Node.js + Express OAuth + session cookies
- Stats API: Python `http.server` JSON API for the status dashboard
- Reverse proxy: nginx
- Hosting: Raspberry Pi (storage under `/srv/storage` and logs/backups under `/srv/backup`)

Primary domain: `https://yumehana.dev`

## Recent refresh (Q1 2026)

- Frontend router (`client/src/main.js`) now prefetches GitHub repo data at boot, drives an upgraded starfield + cursor system, and exposes the `/anni` easter egg route (logo tap ×7). Keep those hooks intact when refactoring navigation.
- Login UI (`client/src/pages/login.js`) performs an optimistic `/api/auth/me` check, surfaces detailed OAuth error codes, and wires logout to nav state. Preserve error keys when touching the backend because the UI expects them.
- Status dashboard pulls richer telemetry from the Python stats API (CPU temp/load/usage, memory, storage mounts, services, fail2ban, recent logs). If you add/remove fields, update both `stats/stats.py` and `client/src/pages/status.js` together.
- Docs/README were synced during this pass. Update both when major features land.

## Repo layout (authoritative)

- `client/`
  - Vite app
  - `src/main.js` is the SPA entry
  - `src/pages/*` are route modules
  - `src/components/*` shared UI
  - `src/posts/*` markdown posts (loaded by the blog page)
  - Output build: `client/dist/`
- `server/`
  - `server.js`: Express server providing `/api/auth/*`
  - `anni-website.service`: systemd unit (note: paths inside are Pi-specific)
  - `.env.example`: OAuth and session configuration template
  - `SETUP.md`: OAuth app setup notes
- `stats/`
  - `stats.py`: lightweight JSON stats API on port 5000
  - `anni-stats.service`: systemd unit
- `nginx/`
  - `yumehana.dev.nginx`: nginx site config
- `deploy.ps1`: Windows deploy script
- `deploy.sh`: Unix deploy script

## Runtime architecture (production)

Request flow:

1. Browser -> Cloudflare Tunnel (HTTPS)
2. Tunnel -> nginx `:80`
3. nginx serves static frontend from `/srv/storage/AnniWebsite`
4. nginx proxies:
   - `/api/auth/*` -> `127.0.0.1:4000` (Node/Express)
   - `/api/stats`  -> `127.0.0.1:5000` (Python stats)

Important invariants:

- Backend binds loopback only: `127.0.0.1:4000`
- Stats binds loopback only: `127.0.0.1:5000`
- Public exposure is only through nginx/tunnel

## Key endpoints

Backend (Node):

- `GET /api/auth/me` -> current session user or 401
- `GET /api/auth/:provider` -> start OAuth flow
- `GET /api/auth/callback/:provider` -> OAuth callback
- `GET /api/auth/logout` -> destroys session
- `GET /api/health` -> health JSON

Stats (Python):

- `GET /api/stats` -> aggregated stats JSON
- `GET /api/stats/health` -> simple health JSON

Frontend routes are hash-based (`#/...`). The login flow redirects to `/#/status`.

## Local development

### Frontend

From `client/`:

- `npm install`
- `npm run dev`

Vite runs on `http://localhost:5173` by default (unless configured otherwise).

### Backend

From `server/`:

- `npm install`
- Copy `.env.example` -> `.env` and fill values (at minimum `SESSION_SECRET`)
- `node server.js` (or `npm run dev`)

Notes:

- Backend uses `FRONTEND_URL` to set allowed origin for credentials.
- Sessions are cookie-based and the app sets `app.set('trust proxy', 1)` because nginx sits in front.

### Stats API

On the Pi it runs via systemd. Locally you can run:

- `python stats.py`

It reads `/proc/*` and systemd; on non-Linux hosts expect partial/empty values.

### Stats payload contract

`stats/stats.py` serves two endpoints:

- `GET /api/stats` → JSON blob with:
  - `uptime`, `cpu_temp`, `cpu_load`, `cpu_usage` (per core),
  - `memory` (totals + swap),
  - `storage` (system + `/srv/storage` + `/srv/backup`),
  - `network` (rx/tx totals + moving rates),
  - `services` (nginx, tailscaled, smbd, cloudflared, fail2ban, anni-website, anni-stats),
  - `fail2ban` (current + total bans),
  - `logs` (nginx access + `journalctl` excerpt).
- `GET /api/stats/health` → lightweight availability check.

Whenever you add fields, update both this doc and the status page renderer so cards don’t break.

## Deployment

### Windows deploy (`deploy.ps1`)

- Uses `ssh` + `scp`
- Deploys:
  - Frontend files from `client/dist/*` -> `${PI_WEB}`
  - Backend files from `server/*` -> `${PI_SERVER}` (excluding `node_modules` and `.env`)
  - Optionally copies `stats/stats.py` -> `${PI_STATS}`

**SSH agent requirement (Windows):**

To avoid repeated passphrase prompts for every `scp`/`ssh`, ensure the OpenSSH agent is running and your key is added:

- Start `ssh-agent` (requires admin once):
  - `Set-Service ssh-agent -StartupType Automatic`
  - `Start-Service ssh-agent`
- Add key (per boot/session):
  - `ssh-add $env:USERPROFILE\.ssh\id_ed25519`

If the agent is not running, deploy may repeatedly prompt and long deploys may fail.

### Unix deploy (`deploy.sh`)

Uses `rsync` for both frontend and backend, and restarts `anni-website`.

### systemd units

- `server/anni-website.service`
  - Runs Node backend.
  - **Paths inside the unit must match actual deployed directory**.
- `stats/anni-stats.service`
  - Runs Python stats.

When diagnosing production issues, the primary tool is:

- `journalctl -u anni-website -n 50 --no-pager`
- `journalctl -u anni-stats -n 50 --no-pager`

## Nginx

`nginx/yumehana.dev.nginx`:

- Serves static root: `/srv/storage/AnniWebsite`
- Proxies auth backend under `/api/auth/`
- Proxies stats endpoint under `/api/stats`

If editing nginx:

- Always run `nginx -t` before reload.
- Prefer explicit `location /api/auth/` (note the trailing slash behavior).

## Secrets and safety rules for AI changes

- Do not commit secrets.
  - `server/.env` contains real secrets; keep it local on the server.
- When editing deploy scripts:
  - Prefer idempotent operations.
  - Keep `.env` preserved on the Pi.
- When editing auth logic:
  - Preserve the whitelist behavior (allowed IDs/emails).
  - Preserve cookie/session security (`httpOnly`, `secure`, `sameSite`).

## Common pitfalls / gotchas

- PowerShell is case-insensitive: do not name functions `SSH`/`SCP` because they can collide with `ssh`/`scp` and recurse.
- Windows PowerShell parsing can break with some non-ASCII characters depending on encoding.
- `systemctl is-active` output includes newlines; always `.Trim()` before comparing.
- `scp` globs are more reliable with forward slashes: `client/dist/*`.

## When you (the AI) should ask before changing things

- OAuth provider settings / callback URLs
- Any path under `/srv/storage` or `/srv/backup`
- systemd unit changes that affect `User`, `WorkingDirectory`, or filesystem permissions

## Quick “where to look” map

- SPA routing / initialization: `client/src/main.js`
- Status dashboard frontend: `client/src/pages/status.js`
- OAuth + sessions: `server/server.js`
- Stats API implementation: `stats/stats.py`
- Reverse proxy rules: `nginx/yumehana.dev.nginx`
- Deployment automation: `deploy.ps1`, `deploy.sh`
