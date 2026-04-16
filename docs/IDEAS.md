# Ideas & Future Experiments

Things that aren't on the roadmap yet but are worth tracking. Not commitments — just good ideas captured before they disappear.

---

## ~~Spotify "Now Playing" Integration~~

**Decision: Implemented.** Discord-style presence widget on the home page. Shows album art, track name, artist, progress bar, and "listen along" link. Auto-hides when nothing is playing.

### How it works

- **Backend**: `server/routes/spotify.js` — OAuth flow, token auto-refresh, `/api/spotify/now-playing` + `/api/spotify/top-tracks`
- **Frontend**: `client/src/components/spotify-widget.js` — polls every 30s (IntersectionObserver, only when visible), smooth progress interpolation
- **Setup**: One-time admin OAuth at `/api/spotify/auth`, refresh token stored in `.env`
- **Design**: Lives between hero and featured projects on the home page. Hidden when not playing.

### Future enhancements

- Top tracks / top artists section (Spotify Wrapped-style stats)
- Organizer sidebar widget
- Optional privacy toggle (env var to disable broadcasting)

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
