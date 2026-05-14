## The organizer outgrew the site

AnniWebsite started as a personal site with an organizer bolted on. Tabs for todos, calendar,
reminders, finance — all inside the same repo, same Express server, same Vite build. That was
fine when it was a side feature. It stopped being fine when it became the main thing.

The organizer was growing faster than the rest of the site. Different purpose, different
deployment cadence, different architecture goals. Keeping them together meant every deploy
touched both, every bug could be anywhere, and the boundary between "personal site" and
"life OS" kept blurring.

The decision was easy once I framed it right: the site is a site. The organizer is a product.
They shouldn't share a codebase.

## Introducing ALOS

AnniLifeOS — ALOS — is the organizer as its own thing. New repo, new subdomain, new service.

Same design language as the rest of the ecosystem (Vite, vanilla JS, Express, SQLite), but
with a clear mandate: this is where your life data lives. Tasks, captures, reminders, finance,
journal, goals — all of it, in one place, connected to an AI that knows your context.

It's live at `alos.yumehana.dev`. The foundation — auth, quick capture, tasks, inbox — is
running. The AI layer is next.

## The split in practice

Pulling the organizer out of AnniWebsite meant:

- Deleting four route files (`todos.js`, `reminders.js`, `finance.js`, `events.js`) and an
  nginx config that had no reason to exist anymore
- New repo scaffolded with the same patterns but cleaner from the start — no legacy decisions
  baked in from the site
- New subdomain added to the Cloudflare Tunnel, nginx vhost, systemd service
- Auth wired up through AnniCore instead of being bundled in with the site's own session logic

The AnniWebsite repo is lighter now. It does one job: be a personal site.

## What ALOS looks like right now

A dark, minimal shell. Starfield background, custom cursor, sidebar nav. Login via AnniCore
OAuth. Quick capture bar on the home screen — type something, hit Enter, it goes into the inbox.
Task list with priorities. That's P0.

It looks clean. It's also deliberately incomplete. The point of P0 is to have something
real to use and iterate on, not to build everything before shipping anything.

## What's next for ALOS

P1 is the AI layer: Claude API integration, streaming responses, and context injection —
so before every chat message the server packages a snapshot of your tasks, captures and
reminders and includes it in the system prompt. The AI won't need you to explain your life
to it. It will already know.

After that: finance tracker UI, journal, goals. Then Tauri wrapper for a native Win11
desktop app. Then Android.

The roadmap is long. The foundation is solid.
