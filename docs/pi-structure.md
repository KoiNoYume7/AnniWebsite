# yme-04 — Pi Infrastructure Reference

> Local ops notes. Gitignored. Do not commit.
> Last full scan: 2026-04-24

---

## Hardware

| Field        | Value                              |
|--------------|------------------------------------|
| Model        | Raspberry Pi 4 Model B Rev 1.1     |
| OS           | Debian GNU/Linux 13 (trixie) 13.4  |
| RAM          | 4 GB (3.7 GiB usable)              |
| Swap         | 2 GB                               |
| Node.js      | v22.22.1                           |
| Python       | 3.13.5                             |
| nginx        | 1.26.3                             |

---

## Storage Layout

| Device          | Size  | Mount           | Purpose                                   |
|-----------------|-------|-----------------|-------------------------------------------|
| `/dev/mmcblk0p2`| 58 GB | `/`             | SD card — root filesystem, all /opt       |
| `/dev/mmcblk0p1`| 510 MB| `/boot/firmware`| Boot partition                            |
| `/dev/sda1`     | 1.9 TB| `/srv/storage`  | External HDD — primary data / storage     |
| `/dev/sdb1`     | 1.9 TB| `/srv/backup`   | External HDD — backup mirror              |

**Design principle**: All services run from the SD card (`/opt/*`) so they stay up even if
the external drives are unplugged. Drives are for persistent DB data and backups only.

---

## Network

| Interface    | Address                 | Note                          |
|--------------|-------------------------|-------------------------------|
| `eth0`       | 10.14.15.62/24          | LAN — primary                 |
| `tailscale0` | 100.96.253.96/32        | Tailscale VPN                 |
| `wlan0`      | DOWN                    | Unused                        |

**Hostname**: `yme-04`  
**SSH**: `ssh akira@yme-04` (works over Tailscale from anywhere)

---

## Listening Ports

| Port  | Process           | Scope       | Purpose                              |
|-------|-------------------|-------------|--------------------------------------|
| 22    | sshd              | All         | SSH                                  |
| 80    | nginx             | All         | HTTP — all web traffic (via Cloudflare Tunnel) |
| 139   | nmbd (Samba)      | All         | NetBIOS                              |
| 445   | smbd (Samba)      | All         | SMB file shares                      |
| 4000  | node (anni-website)| localhost  | AnniWebsite backend API               |
| 5000  | python3 (anni-stats)| localhost | System stats API                     |
| 20241 | unknown           | localhost   | (check with `ss -tlnp`)             |

---

## Cloudflare Tunnel

**Tunnel ID**: `137fb7ee-e963-4efb-be95-07ae78deafcf`  
**Config**: `/etc/cloudflared/config.yml`  
**Credentials**: `/home/akira/.cloudflared/137fb7ee-e963-4efb-be95-07ae78deafcf.json`

### Ingress Rules (ordered, first match wins)

| Hostname               | Backend              |
|------------------------|----------------------|
| `yumehana.dev`         | `http://localhost:80`|
| `www.yumehana.dev`     | `http://localhost:80`|
| `yme-04.yumehana.dev`  | `ssh://localhost:22` |
| `sc.yumehana.dev`      | `http://localhost:80`|
| `showcase.yumehana.dev`| `http://localhost:80`|
| *(catch-all)*          | `http_status:404`    |

All web subdomains funnel to nginx on :80; nginx routes by `server_name`.

---

## nginx Virtual Hosts

Config lives in `/etc/nginx/sites-available/`, symlinked into `sites-enabled/`.

| File                      | server_name              | Root / Purpose                        |
|---------------------------|--------------------------|---------------------------------------|
| `yumehana.dev`            | `yumehana.dev`, `www.`   | `/opt/anni/www` — AnniWebsite SPA     |
| `sc.yumehana.dev`         | `sc.yumehana.dev`        | `/opt/anni/sc` — CZTimers             |
| `showcase.yumehana.dev`   | `showcase.yumehana.dev`  | `/opt/fabric-calc/www` — Fabric Calc  |

Repo counterparts are in `AnniWebsite/nginx/*.nginx`.

---

## /opt Layout (SD card)

```
/opt/
├── anni/                         # AnniWebsite stack (akira:akira)
│   ├── www/                      # Built Vite frontend (deployed by deploy.ps1)
│   │   ├── index.html
│   │   ├── favicon.svg
│   │   └── assets/               # Hashed JS + CSS bundles
│   ├── server/                   # Node.js/Express backend
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── db/
│   │   │   ├── db.js
│   │   │   ├── schema.sql
│   │   │   ├── sessions.db       # ⚠ local, never deploy
│   │   │   └── organizer.db      # symlink → /srv/storage/AnniWebsite/server/db/organizer.db
│   │   ├── .env                  # ⚠ secrets — never deploy
│   │   ├── .env.example
│   │   ├── package.json
│   │   ├── node_modules/
│   │   └── anni-website.service  # copy of the systemd unit for reference
│   ├── sc/                       # CZTimers — sc.yumehana.dev (akira:akira)
│   │   ├── index.html
│   │   ├── app.js
│   │   ├── styles.css
│   │   ├── anni-nav.css
│   │   ├── anni-nav.js
│   │   ├── favicon.svg
│   │   └── lib/
│   │       ├── cfg.dat           # Unix timestamp anchor (updated by update-cfg.ps1)
│   │       ├── status.json       # outdated flag + SC version info
│   │       └── sc_version.txt    # last known-good SC version
│   └── stats/                    # Python stats API
│       └── stats.py              # Runs on :5000, proxied at /api/stats
│
└── fabric-calc/                  # Separate project — Fabric Calculator
    └── www/                      # showcase.yumehana.dev
```

---

## /srv Layout (external HDDs)

```
/srv/
├── storage/   (/dev/sda1 — 1.9 TB primary)
│   ├── AnniWebsite/
│   │   └── server/
│   │       └── db/
│   │           └── organizer.db  # ← symlinked into /opt/anni/server/db/organizer.db
│   └── SteamLibrary/             # (games, appmanifests — unrelated to web stack)
│
└── backup/    (/dev/sdb1 — 1.9 TB backup mirror)
    └── (currently has Games + SteamLibrary — web data not yet backed up here)
```

---

## systemd Services

| Unit                    | User   | Working Dir        | Command               | Purpose                    |
|-------------------------|--------|--------------------|-----------------------|----------------------------|
| `anni-website.service`  | akira  | `/opt/anni/server` | `node server.js`      | AnniWebsite backend :4000  |
| `anni-stats.service`    | akira  | `/opt/anni/stats`  | `python3 stats.py`    | System stats API :5000     |
| `cloudflared.service`   | root   | —                  | `cloudflared tunnel run` | Cloudflare Tunnel       |

Useful commands:
```bash
sudo systemctl restart anni-website
sudo systemctl restart cloudflared
sudo systemctl reload nginx
sudo nginx -t                        # test config before reload
journalctl -u anni-website -n 50    # view logs
```

---

## Users

| User       | UID  | Shell        | Note                              |
|------------|------|--------------|-----------------------------------|
| `akira`    | 1000 | bash         | Primary admin; owns /opt/anni     |
| `services` | 1001 | bash         | Service account (Samba share)     |

`akira` is in: `adm dialout cdrom sudo audio video plugdev games users input render netdev spi i2c gpio`

---

## Samba Shares

| Share    | Path           | Users              | Purpose                   |
|----------|----------------|--------------------|---------------------------|
| `KNY-01` | `/srv/storage` | akira, services    | Primary storage NAS share |
| `KNY-02` | `/srv/backup`  | akira              | Backup drive share        |

---

## Deployment Flow

```
Dev machine (Windows)
  │
  ├── .\deploy.ps1              → builds AnniWebsite frontend + deploys to /opt/anni/www + /opt/anni/server
  ├── .\deploy.ps1 -ScOnly      → deploys CZTimers src/ to /opt/anni/sc
  └── scp nginx/*.nginx         → manually copy + symlink if nginx configs change (see below)

Pi (yme-04)
  │
  ├── nginx reads /etc/nginx/sites-enabled/
  ├── cloudflared routes to localhost:80
  └── node (anni-website) on :4000, python (anni-stats) on :5000
```

### Deploying an nginx config change
```bash
# On dev machine:
scp nginx/sc.yumehana.dev.nginx akira@yme-04:/tmp/
# On Pi:
sudo mv /tmp/sc.yumehana.dev.nginx /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/sc.yumehana.dev /etc/nginx/sites-enabled/sc.yumehana.dev
sudo nginx -t && sudo systemctl reload nginx
```

### Deploying CZTimers data
```powershell
# Run from AnniWebsite repo root (Windows):
.\deploy.ps1 -ScOnly
# This automatically calls CZTimers\update-cfg.ps1 first, then rsyncs src/ to the Pi.
# update-cfg.ps1 writes: lib/cfg.dat, lib/cfg-sc{version}.dat, lib/latest.json, lib/status.json
```

---

## SSO / Auth

Session cookie is set with `domain: .yumehana.dev` in production — shared across all subdomains.

`anni-nav.js` on `sc.yumehana.dev` fetches `https://yumehana.dev/api/auth/me` with
`credentials: include`. Same-site cookie rules allow this (both are `yumehana.dev` eTLD+1).

CORS in `server.js` allows both `https://yumehana.dev` and `https://sc.yumehana.dev` as origins.

Login still happens at `yumehana.dev/#/login`. After login the cookie is valid site-wide.

---

## SC Loot Tracker — API routes

All routes require auth (`401` if unauthenticated).

| Method | Path                          | Description                          |
|--------|-------------------------------|--------------------------------------|
| GET    | `/api/sc/inventory`           | Own loot list                        |
| POST   | `/api/sc/inventory`           | Add/update item `{ item_name, category, quantity, notes }` |
| DELETE | `/api/sc/inventory/:id`       | Remove item                          |
| GET    | `/api/sc/groups`              | Groups user belongs to               |
| POST   | `/api/sc/groups`              | Create group `{ name }`              |
| POST   | `/api/sc/groups/join`         | Join group `{ invite_code }`         |
| DELETE | `/api/sc/groups/:id/leave`    | Leave (or delete if owner)           |
| GET    | `/api/sc/groups/:id/inventory`| Combined group loot view             |

DB tables: `sc_inventory`, `sc_groups`, `sc_group_members` (in `organizer.db`).

---

## SC Loot Tracker — DB tables

| Table              | Columns                          | Description                          |
|--------------------|----------------------------------|--------------------------------------|
| `sc_inventory`     | `id`, `user_id`, `item_name`, `category`, `quantity`, `notes` | User's loot list                     |
| `sc_groups`        | `id`, `name`, `owner_id`         | Groups user belongs to               |
| `sc_group_members` | `id`, `group_id`, `user_id`      | Group membership                     |
