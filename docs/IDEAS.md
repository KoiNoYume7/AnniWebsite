# Ideas & Future Experiments

Things that aren't on the roadmap yet but are worth tracking. Not commitments — just good ideas captured before they disappear.

---

## ~~Spotify "Now Playing" Integration~~

**Decision: Implemented (v2.1).** Live Activity widget in the builder section of the home page. Shows album art with glow, track name (marquee for long titles), artist, animated progress bar, equalizer bars, and recently played / top tracks strip.

### How it works

- **Backend**: `server/routes/spotify.js` — OAuth flow, token auto-refresh, SSE streaming (`/api/spotify/stream`), REST fallback (`/api/spotify/now-playing`), `/api/spotify/recent-tracks`, `/api/spotify/top-tracks`
- **Frontend**: `client/src/components/spotify-widget.js` — SSE-based (EventSource), REST fallback on error, smooth progress interpolation, dominant color extraction from album art
- **Setup**: One-time admin OAuth at `/api/spotify/auth`, refresh token stored in `.env`
- **Design**: Integrated into the "builder" section with a `section-eyebrow` label. Three states: Now Playing (green dot + equalizer), Paused (amber dot), Offline (grey dot, "Not listening right now"). Never fully hides.
- **Floating panel**: `client/src/components/live-activity-panel.js` — dismissible bottom-right panel on all non-home routes

### Possible future enhancements

- Optional privacy toggle (env var to disable broadcasting)
- Genre breakdown or listening stats page

---

## More ideas (unstructured)

- **GitHub contribution graph** widget on home — fetch from GitHub API, render a mini heatmap
- **Pi telemetry on home** — a tiny "server health" pulse (CPU temp, uptime) visible publicly, no auth needed since it's read-only summary data
- **Public roadmap page** (`#/roadmap`) — rendered from `docs/TODO.md` so it stays in sync with actual dev state automatically
- **Dark/light mode per-page memory** — remember which page you were on and scroll position across theme changes
- **Organizer public share links** — share a read-only view of your todo list or finance summary with a signed token (Phase 5+)

---

## Resolved ideas

### ~~Rework or scrap `#/status` (Pi stats dashboard)~~

**Decision: Deleted.** The Pi dashboard (`#/status`), Python stats API (`stats/`), and nginx `/api/stats` proxy block have been removed. The full status page was maintenance overhead for something nobody but the admin sees. If server health monitoring is needed, use a proper tool (Uptime Kuma, Grafana, etc.) instead of building it into the website.

### ~~Discord server invite~~

**Decision: Disabled.** The Discord CTA on the home page is preserved but greyed out with `opacity:0.55; pointer-events:none`. It shows "Coming Soon" instead of a join link. Re-enable it by removing those styles in `home.js` and updating the invite URL when the server is ready.
