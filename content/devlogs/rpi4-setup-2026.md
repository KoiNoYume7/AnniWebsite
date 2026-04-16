## The Goal

I wanted a secure, always-on home server that I could trust to host real services.
Raspberry Pi 4, fresh Raspberry Pi OS Lite 64-bit, and a clean slate.

## Step 1: Harden everything first

Before installing anything useful, I locked the system down:
- SSH key-only auth (configured in the Raspberry Pi Imager tool before even flashing)
- UFW firewall: deny all incoming, allow outgoing
- Fail2ban for SSH brute-force protection
- Unattended security upgrades

## Step 2: Tailscale

Tailscale was the game-changer. Once installed, I restricted SSH to only be reachable
through the Tailscale interface — meaning the server isn't exposed to the internet at all
for admin purposes.

```bash
sudo ufw delete allow ssh
sudo ufw allow in on tailscale0 to any port 22
```

## Step 3: Samba for NTFS drives

Two external NTFS drives mounted at `/srv/storage` and `/srv/backup`.
Samba configured to only accept connections over the Tailscale interface.

## Step 4: This website

Built with Vite, pure vanilla JS, no frameworks. Designed from scratch.
Served via Nginx, exposed via Cloudflare Tunnel — no inbound ports open.

The result: a server I actually trust.
