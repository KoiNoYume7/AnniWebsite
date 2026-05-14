## The Pi was a mess

Three months of adding services without a plan had left `/opt/anni` looking like a drawer
nobody organises. `server/`, `www/`, `alos/`, `alos-server/`, `sc/` — all flat, no naming
convention, no clear separation between static files and backends. Adding a new service meant
guessing where things lived.

The infra rework fixed that. Everything in `/opt/anni` now follows a single pattern:
`<project>-www/` for static files served by nginx, `<project>/` for the backend service.
No ambiguity.

```
/opt/anni/
  website/        → AnniWebsite backend  (:4000)
  website-www/    → AnniWebsite frontend (nginx)
  alos/           → ALOS backend         (:4100)
  alos-www/       → ALOS frontend        (nginx)
  core/           → AnniCore             (:4200)
  sc-www/         → AnniSCTools          (nginx, static)
```

Running a migration script across a live Pi while keeping the site up isn't something you
want to improvise. I wrote it out as a proper PowerShell deploy script — idempotent, step
by step, with a full backup of `/opt/anni` before touching anything. It renamed directories,
updated systemd service files, updated nginx configs, and reloaded everything in order.
The site was down for about thirty seconds.

## AnniCore

Auth used to live inside AnniWebsite. That was fine when the organizer lived there too.
Now that ALOS is separate, and eventually other services will need auth too, bundling it
with the site doesn't make sense.

AnniCore is the answer: a small dedicated Express service running on port 4200 at
`auth.yumehana.dev`. OAuth via GitHub, Discord and Google. Session cookies scoped to
`.yumehana.dev` so they work across every subdomain. Every other service — ALOS, AnniWebsite,
anything that comes next — validates sessions with a single internal request to
`http://127.0.0.1:4200/api/auth/me`. They don't handle OAuth at all.

One auth layer. Everything else is a consumer.

## The naming thing

Every project in the ecosystem now has a short identifier:
ALOS, ACo, AWe, ASCT, AW11, AAud, APx, ALog. Keeps conversations (and commit messages) readable
without typing the full name every time.

## YUME

This is also when the umbrella got a name.

All the Anni projects were always building toward something — a personal AI that knows your
life, handles your tasks, understands your finances, remembers what you told it last week.
I'd been calling it "the Jarvis thing" internally for a while.

Now it has a name: **YUME** — *Your Unified Memory & Experience*.

夢 means "dream" in Japanese. Fitting.

The vision doc is in the repo. The products are being built. ALOS is the first real piece.
YUNA (notification routing) is next in line. The rest will follow.

It's ambitious. I know. That's kind of the point.
