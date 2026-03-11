# AnniBackend — OAuth Setup Guide

## Overview

The backend runs as a Node.js service on your Pi (port 4000), proxied through nginx.
It handles OAuth for GitHub, Discord, and Google — only your whitelisted accounts can log in.

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

## Step 2 — Deploy to the Pi

```bash
# On your Pi, as the services user
sudo mkdir -p /home/services/AnniBackend
sudo chown services:services /home/services/AnniBackend

# Copy files (from your dev machine)
scp -r AnniBackend/* koi@rpi4:/home/services/AnniBackend/

# On the Pi
cd /home/services/AnniBackend
npm install
```

---

## Step 3 — Configure .env

```bash
cp .env.example .env
nano .env
```

Fill in all values. Generate SESSION_SECRET:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Lock down the file:
```bash
chmod 600 .env
```

---

## Step 4 — Install systemd service

```bash
sudo cp anni-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable anni-backend
sudo systemctl start anni-backend

# Check it's running
sudo systemctl status anni-backend
sudo journalctl -u anni-backend -f
```

---

## Step 5 — Configure nginx

```bash
sudo cp yumehana.dev.nginx /etc/nginx/sites-available/yumehana.dev
sudo ln -s /etc/nginx/sites-available/yumehana.dev /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6 — Update the frontend files

Replace these two files in your AnniWebsite:
- `src/pages/login.js` → use the new `login.js` from this folder
- `src/components/nav.js` → use the new `nav.js` from this folder

Then rebuild and deploy:
```bash
npm run build
sudo cp -r dist/* /var/www/html/
```

---

## Step 7 — Test it

1. Visit `https://yumehana.dev/#/login`
2. Click **Continue with GitHub**
3. Authorize on GitHub
4. You should be redirected to `#/status` logged in

If something goes wrong:
```bash
sudo journalctl -u anni-backend -f   # live backend logs
sudo tail -f /var/log/nginx/error.log # nginx errors
```

---

## UFW — no extra ports needed

The backend only listens on `127.0.0.1:4000` (loopback only), so no firewall rules are needed.
nginx proxies `/api/*` to it internally.
