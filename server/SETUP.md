# AnniWebsite — Pi Setup Guide

For initial Pi setup or first-time deployment.
For day-to-day deploys, use `deploy.ps1` from the repo root.
For full infra reference (all services, ports, nginx, OAuth), see **`AnniCore/INFRA.md`**.

---

## Overview

```
/opt/anni/website/       SD card — Node/Express backend (port 4000)
/opt/anni/website-www/   SD card — built Vite frontend
/srv/storage/AnniWebsite/sc.db   external drive — SC loot DB
```

Auth (OAuth, sessions, users) is fully owned by **AnniCore** at `auth.yumehana.dev`.
AnniWebsite proxies `/api/auth/*` to AnniCore and verifies sessions by calling
`AnniCore /api/auth/me` per request.

---

## Step 1 — OAuth app setup

OAuth is configured in AnniCore, not here. See `AnniCore/INFRA.md` → OAuth Apps.

---

## Step 2 — Pi directory layout

Run this once on the Pi, or run `AnniCore/migrate-pi.ps1` which handles all of it:

```bash
sudo mkdir -p /opt/anni/website/db /opt/anni/website-www
sudo chown -R akira:akira /opt/anni

# SC DB on storage drive
sudo mkdir -p /srv/storage/AnniWebsite
sudo chown -R akira:akira /srv/storage/AnniWebsite
```

Then from your dev machine:
```powershell
.\deploy.ps1   # copies server/ to /opt/anni/website, builds + deploys frontend
```

---

## Step 3 — Configure .env

```bash
cd /opt/anni/website
cp .env.example .env
nano .env
```

Required values:
- `PORT=4000`
- `ANNI_CORE_URL=http://127.0.0.1:4200`
- `CONTACT_DISCORD_WEBHOOK_URL=...`
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`

```bash
chmod 600 .env
```

---

## Step 4 — systemd service

```bash
sudo cp /opt/anni/website/anni-website.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now anni-website
sudo systemctl status anni-website
sudo journalctl -u anni-website -f
```

---

## Step 5 — nginx

```bash
sudo cp /path/to/AnniWebsite/nginx/yumehana.dev.nginx \
        /etc/nginx/sites-available/yumehana.dev
sudo ln -sf /etc/nginx/sites-available/yumehana.dev \
            /etc/nginx/sites-enabled/yumehana.dev
sudo nginx -t && sudo systemctl reload nginx
```

Nginx serves `/opt/anni/website-www` as doc root and proxies `/api/*` to `:4000`.

---

## Step 6 — Test

1. Visit `https://yumehana.dev` — site loads
2. Visit `https://auth.yumehana.dev` — AnniCore login page
3. Log in → session cookie set on `.yumehana.dev`
4. `https://yumehana.dev/api/auth/me` → returns your user

```bash
sudo journalctl -u anni-website -f
sudo tail -f /var/log/nginx/anni-error.log
```

---

## UFW

Backend binds `127.0.0.1:4000` — no extra firewall rules needed.
nginx proxies all `/api/*` internally.
