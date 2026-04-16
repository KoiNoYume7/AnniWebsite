# AnniWebsite — Pi Setup Guide

Full one-time setup for the Pi. If you're just pushing code changes,
use `deploy.sh` / `deploy.ps1` from the repo root instead.

---

## Overview

The site runs on a Raspberry Pi 4, split across the SD card and an
external storage drive:

```
/opt/anni/                   # SD card — always available
├── www/                     # Built frontend (Vite output)
├── server/                  # Node/Express backend
│   ├── server.js
│   ├── routes/
│   ├── db/
│   │   ├── db.js
│   │   ├── schema.sql
│   │   ├── sessions.db      # session store (local to SD)
│   │   └── organizer.db ──► symlink to storage drive
│   └── .env
└── stats/                   # Python stats API
    └── stats.py

/srv/storage/AnniWebsite/    # External USB drive (hot-pluggable)
└── server/db/organizer.db   # real file lives here
```

The backend listens on `127.0.0.1:4000`, the stats API on
`127.0.0.1:5000`, and nginx proxies `yumehana.dev` to both.
Only user data (`organizer.db`) lives on the storage drive — so
unplugging the drive degrades the organizer but keeps the rest of
the site up.

---

## Step 1 — Create the OAuth Apps

### GitHub
1. Go to https://github.com/settings/developers
2. Click **OAuth Apps** → **New OAuth App**
3. Fill in:
   - Application name: `AnniWebsite`
   - Homepage URL: `https://yumehana.dev`
   - Authorization callback URL: `https://yumehana.dev/api/auth/callback/github`
4. Click **Register application**
5. Copy **Client ID** and generate a **Client Secret** → save both

Find your GitHub user ID:
```bash
curl https://api.github.com/users/KoiNoYume7
# Look for the "id" field — it's a number like 12345678
```

---

### Discord
1. Go to https://discord.com/developers/applications
2. Click **New Application** → name it `AnniWebsite`
3. Go to **OAuth2** in the left sidebar
4. Under **Redirects**, click **Add Redirect**:
   - `https://yumehana.dev/api/auth/callback/discord`
5. Copy **Client ID** and **Client Secret** from the OAuth2 page

Find your Discord user ID:
1. Open Discord → Settings → Advanced → Enable **Developer Mode**
2. Right-click your own username anywhere → **Copy User ID**

---

### Google
1. Go to https://console.cloud.google.com
2. Create a new project (e.g. `AnniWebsite`) or use an existing one
3. Go to **APIs & Services** → **OAuth consent screen**
   - User type: **External**
   - Fill in app name, your email, save
   - Under **Scopes**: add `email`, `profile`, `openid`
   - Under **Test users**: add your Google email
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Name: `AnniWebsite`
   - Authorized redirect URIs: `https://yumehana.dev/api/auth/callback/google`
6. Copy **Client ID** and **Client Secret**

---

## Step 2 — Create the Pi directory layout

On the Pi:

```bash
sudo mkdir -p /opt/anni/www /opt/anni/server/db /opt/anni/stats
sudo chown -R akira:akira /opt/anni

# Storage drive — where the organizer DB lives
sudo mkdir -p /srv/storage/AnniWebsite/server/db
sudo chown -R akira:akira /srv/storage/AnniWebsite

# Symlink the organizer DB into the SD card tree so db.js can open it
# at the hardcoded path. If the drive is unplugged the symlink is
# dangling and the backend enters degraded mode.
ln -sf /srv/storage/AnniWebsite/server/db/organizer.db \
       /opt/anni/server/db/organizer.db
```

Then from your dev machine push the code:

```bash
./deploy.sh         # Linux/macOS
.\deploy.ps1        # Windows
```

The first deploy will copy `server/` to `/opt/anni/server/` and install
Node dependencies. You still need to create `.env` by hand before the
service will start.

---

## Step 3 — Configure .env

On the Pi:

```bash
cd /opt/anni/server
cp .env.example .env
nano .env
```

Fill in all values. Generate `SESSION_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Lock down the file:
```bash
chmod 600 .env
```

**Never put `.env` on the storage drive.** Deploy scripts preserve the
SD-card copy, which is what you want.

---

## Step 4 — Install systemd services

```bash
sudo cp /opt/anni/server/anni-website.service /etc/systemd/system/
sudo cp /opt/anni/stats/anni-stats.service    /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now anni-website anni-stats

# Check both
sudo systemctl status anni-website
sudo systemctl status anni-stats
sudo journalctl -u anni-website -f
```

---

## Step 5 — Configure nginx

```bash
sudo cp /opt/anni/server/../nginx/yumehana.dev.nginx \
        /etc/nginx/sites-available/yumehana.dev
sudo ln -sf /etc/nginx/sites-available/yumehana.dev \
            /etc/nginx/sites-enabled/yumehana.dev
sudo nginx -t
sudo systemctl reload nginx
```

The nginx config serves `/opt/anni/www` as the document root and logs
to `/var/log/nginx/anni-{access,error}.log`. `X-Forwarded-Proto` is
taken from Cloudflare's header so session cookies get the `Secure`
flag correctly.

---

## Step 6 — Storage drive auto-mount (optional but recommended)

If you want the storage drive to mount automatically on hot-plug, set
up the systemd mount unit + udev rule — see the Pi's
`/etc/udev/rules.d/99-anni-automount.rules` for the current working
config. Without this, you need to `sudo systemctl start srv-storage.mount`
after plugging the drive back in.

When the drive is unmounted, the organizer tab goes into "under
maintenance" mode but login, home, blog, projects, and stats all keep
working.

---

## Step 7 — Test it

1. Visit `https://yumehana.dev/#/login`
2. Click **Continue with GitHub**
3. Authorize on GitHub
4. You should be redirected to `#/organizer` logged in

If something goes wrong:
```bash
sudo journalctl -u anni-website -f         # live backend logs
sudo tail -f /var/log/nginx/anni-error.log # nginx errors
```

---

## UFW — no extra ports needed

The backend and stats API both bind loopback only (`127.0.0.1:4000`,
`127.0.0.1:5000`), so no firewall rules are required. nginx proxies
`/api/*` internally.
