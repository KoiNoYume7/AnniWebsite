# Ideas & Future Experiments

Things that aren't on the roadmap yet but are worth tracking. Not commitments — just good ideas captured before they disappear.

---

## Spotify "Now Playing" Integration

Discord-style presence widget showing what KoiNoYume7 is listening to right now, or their top tracks/artists over different time ranges.

### What it could look like

- Small widget on the home page or organizer sidebar: album art, track name, artist name, playback progress bar
- "Listen along" link that opens the track in Spotify
- Top tracks / top artists section (Spotify Wrapped-style stats)
- Optional toggle: only visible when you enable "show now playing" — so you're not always broadcasting what you're listening to

### Implementation sketch

**OAuth flow (server-side only)**
- Register an app at [developer.spotify.com](https://developer.spotify.com) — redirect URI points to `/api/spotify/callback`
- Standard OAuth 2.0 flow. Store the refresh token in `server/.env` (single-user, no DB needed for now)
- Access tokens expire in 1 hour — server auto-refreshes using the stored refresh token

**Endpoints needed on the backend**
- `GET /api/spotify/now-playing` — calls Spotify `GET /v1/me/player/currently-playing`, returns track info or `null` if nothing is playing
- `GET /api/spotify/top-tracks?range=short_term|medium_term|long_term` — calls `GET /v1/me/top/tracks`

**Frontend widget**
- Polls `/api/spotify/now-playing` every 30 seconds (only when visible, use IntersectionObserver)
- Spotify returns `204 No Content` when nothing is playing — widget gracefully shows "not listening right now" or hides itself
- Progress bar: Spotify gives `progress_ms` and `duration_ms` — interpolate with a `setInterval` between polls for smooth animation

### Design questions to answer before building

1. **Where does it live?** Home page hero? Footer? Organizer sidebar as a widget? All three?
2. **Always on or opt-in?** If it shows everything always, it's a privacy question. A manual toggle (stored in a simple config row or just `server/.env`) keeps control.
3. **Top tracks format?** Simple numbered list, cards with album art, or a mini chart?
4. **"Listen along" UX?** Just a Spotify deep link, or embed a Spotify play button (requires Spotify Web Playback SDK, much more complex)?

### Complexity notes

- The OAuth flow is straightforward but the token refresh cycle needs to be solid — a failed refresh kills the widget silently
- Spotify's Web API is free for personal use within the rate limits — no concern at this scale
- No new DB table needed for the single-user case; multi-user would require storing refresh tokens per user in the `users` table

### Priority

**Low** — fun personality feature, good for making the home page feel alive. Revisit after Phase 2 organizer features ship.

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
