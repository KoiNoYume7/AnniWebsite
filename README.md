# AnniWebsite

Personal website for KoiNoYume7 — project showcase, devlog, and private status dashboard.
Live at [yumehana.dev](https://yumehana.dev).

## Stack
- **Vite** — build tool
- **Vanilla JS** — no framework, just clean modules
- **DM Sans + Syne + DM Mono** — typography
- Custom hash router, starfield, cursor effects, easter eggs

## Structure
```
src/
  styles/
    global.css       # CSS vars, reset, animations
    components.css   # Buttons, cards, nav, shared UI
  components/
    nav.js           # Sticky nav
    footer.js        # Footer
  pages/
    home.js          # Landing page
    about.js         # Bio & skills
    projects.js      # GitHub-fetched projects
    blog.js          # Devlog / markdown posts
    contact.js       # Discord webhook contact form
    login.js         # OAuth login (GitHub / Discord / Google)
    status.js        # Private system dashboard (auth-gated)
  main.js            # Router, starfield, cursor, easter eggs
```

## Dev setup
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # outputs to /dist
```

## Deploy on RPi4
```bash
npm run build
sudo cp -r dist/* /var/www/html/
```

## Configuration

### Discord Webhook (contact form)
In `src/pages/contact.js`, replace:
```js
const DISCORD_WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL_HERE'
```

### OAuth (login)
In `src/pages/login.js`, the `startOAuth()` function currently runs in demo mode.
For real OAuth, set up the Express backend (`/api/auth/*`) and replace the demo block
with `window.location.href = OAUTH[provider].url`.

Backend routes needed:
- `GET /api/auth/github` → redirect to GitHub OAuth
- `GET /api/auth/discord` → redirect to Discord OAuth  
- `GET /api/auth/google` → redirect to Google OAuth
- `GET /api/auth/callback/:provider` → exchange code, set session, redirect

## Easter Eggs
- **Konami code**: ↑↑↓↓←→←→BA — activates late night mode overlay
- **Logo click ×7**: navigates to secret `/anni` page
- **Secret route**: `/#/anni`

## Status Dashboard
The status page (`/#/status`) is auth-gated. Currently uses demo/randomized data.
To hook up real data, create a Python/Node endpoint on the Pi that reads:
- `/proc/stat` — CPU usage
- `/proc/meminfo` — memory
- `vcgencmd measure_temp` — CPU temperature
- `df -h` — storage
- `uptime` — uptime & load
- `/proc/net/dev` — network traffic

Return JSON and replace the `updateStats()` function with a `fetch('/api/stats')` call.
