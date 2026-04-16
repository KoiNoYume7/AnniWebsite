## The problem

The original setup put everything on the external storage drive at `/srv/storage`.
That seemed fine until I realized: if the drive gets unplugged (physically bumped,
USB flake, power issue), the entire website goes down. Not just the organizer — everything.

That's unacceptable for something that's supposed to be always-on.

## The fix: split code from data

The new layout puts all code and static files on the Pi's SD card under `/opt/anni/`:

```
/opt/anni/
├── www/        # Built frontend (Vite output)
├── server/     # Node/Express backend
│   └── db/
│       ├── sessions.db       # Local to SD
│       └── organizer.db ───► symlink to storage drive
└── stats/      # Python stats API
```

The only thing on the external drive is `organizer.db` — the actual user data. It's
symlinked into `/opt/anni/server/db/` so the backend opens it transparently.

## Graceful degradation

When the storage drive is unplugged, the symlink goes dangling. The backend detects this
and enters "degraded mode": the organizer tab shows a maintenance page, but the home page,
projects, devlog, contact form, and login all keep working normally.

This means the site survives a drive failure. The organizer is temporarily unavailable,
but everything else is fine. Plug the drive back in and it recovers automatically.

## Deploy scripts updated

Both `deploy.ps1` (Windows) and `deploy.sh` (Linux/macOS) now target `/opt/anni/` paths.
They skip `.env` and `.db` files to preserve secrets and data on the Pi.

The systemd services (`anni-website.service`, `anni-stats.service`) now use
`WorkingDirectory=/opt/anni/server` instead of the old storage path.

## Lesson learned

Never put code on a drive that might disappear. Code goes on the boot device.
Data goes on the storage device. Symlinks bridge the gap.
