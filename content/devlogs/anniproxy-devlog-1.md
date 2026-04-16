## The Problem

I wanted a proxy browser I actually owned. Most hosted solutions track you,
rate-limit you, or go down at inconvenient times. Self-hosting was the obvious answer.

## AnniProxy — early design

The core idea: a backend service that manages proxy routing,
handles browser sessions, and gives you a dashboard to control it all.

Built with Node.js, designed to run on any Linux box. The goal is a lightweight,
privacy-first proxy that you deploy once and forget about.

## Architecture decisions

- **No Electron, no browser bundling** — this is a backend service that your real browser talks to
- **Session isolation** — each proxy session gets its own cookie jar and fingerprint
- **Dashboard** — a web UI for managing routes, sessions, and logs
- **Self-contained** — everything runs in a single process, no Docker required (but supported)

## Current status

Early WIP. The repo is public at [github.com/KoiNoYume7/AnniProxy](https://github.com/KoiNoYume7/AnniProxy).
Devlogs will be posted here as it progresses.

Stay tuned.
