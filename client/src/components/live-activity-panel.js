// ── Live Activity floating side panel ──
// Global, fixed bottom-right. Opens its own SSE stream to /api/spotify/stream.
// Visible on all pages EXCEPT home (the hero widget owns that view) and login.
// Dismissible via the × button (persists in localStorage for the session).
// Expands on hover/click for a larger player; shrinks back when pointer leaves.
//
// Expanded extras:
//   - Spinning conic ring around album art
//   - Album name revealed
//   - Elapsed / total time
//   - Marquee for long track names

const STORAGE_DISMISS = 'livepanel_dismissed_v1'
const HIDDEN_ROUTES   = new Set(['', 'home', 'login'])

let rootEl        = null
let eventSource   = null
let progressTimer = null
let currentProgress = 0
let currentDuration = 0
let isPlaying     = false
let lastTrackUrl  = null
let lastState     = null
let routeListener = null

export function mountLiveActivityPanel() {
  if (rootEl) return  // idempotent

  const dismissed = localStorage.getItem(STORAGE_DISMISS) === '1'
  if (dismissed) return

  injectStyles()

  rootEl = document.createElement('div')
  rootEl.id = 'live-activity-root'
  rootEl.className = 'lap lap--hidden'
  rootEl.innerHTML = `
    <div class="lap-pulse" aria-hidden="true"></div>
    <div class="lap-card">
      <button class="lap-close" id="lap-close" title="Dismiss" aria-label="Dismiss live activity">&times;</button>

      <div class="lap-header">
        <div class="lap-dot" id="lap-dot"></div>
        <span class="lap-header-label" id="lap-header-label">Live Activity</span>
        <span class="lap-header-spacer"></span>
        <div class="lap-eq" id="lap-eq">
          <span></span><span></span><span></span>
        </div>
      </div>

      <div class="lap-body" id="lap-body">
        <div class="lap-art-wrap">
          <div class="lap-vinyl-ring" aria-hidden="true"></div>
          <div class="lap-art" id="lap-art"></div>
          <div class="lap-art-glow" id="lap-art-glow"></div>
        </div>
        <div class="lap-info">
          <div class="lap-track-vp">
            <div class="lap-track" id="lap-track">—</div>
          </div>
          <div class="lap-artist" id="lap-artist">Spotify</div>
          <div class="lap-album" id="lap-album"></div>
          <div class="lap-bar">
            <div class="lap-bar-fill" id="lap-bar-fill"></div>
          </div>
          <div class="lap-times">
            <span id="lap-time-cur">0:00</span>
            <span id="lap-time-tot">0:00</span>
          </div>
        </div>
      </div>

      <a class="lap-open-link" id="lap-open-link" href="#" target="_blank" rel="noopener" title="Open in Spotify">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
      </a>
    </div>
  `
  document.body.appendChild(rootEl)

  // Dismiss button
  rootEl.querySelector('#lap-close').addEventListener('click', (e) => {
    e.stopPropagation()
    dismiss()
  })

  // Expand/collapse
  const card = rootEl.querySelector('.lap-card')
  card.addEventListener('mouseenter', () => {
    rootEl.classList.add('lap--expanded')
    requestAnimationFrame(applyPanelMarquee)
  })
  card.addEventListener('mouseleave', () => {
    rootEl.classList.remove('lap--expanded')
    clearPanelMarquee()
  })
  card.addEventListener('click', (e) => {
    if (e.target.closest('.lap-close, .lap-open-link')) return
    const wasExpanded = rootEl.classList.toggle('lap--expanded')
    if (wasExpanded) {
      requestAnimationFrame(applyPanelMarquee)
    } else {
      clearPanelMarquee()
    }
  })

  connectSSE()

  // Show/hide based on current route + route changes
  applyRouteVisibility()
  routeListener = () => applyRouteVisibility()
  window.addEventListener('hashchange', routeListener)
}

export function unmountLiveActivityPanel() {
  if (!rootEl) return
  if (eventSource) { eventSource.close(); eventSource = null }
  clearInterval(progressTimer)
  if (routeListener) {
    window.removeEventListener('hashchange', routeListener)
    routeListener = null
  }
  rootEl.remove()
  rootEl = null
}

function dismiss() {
  localStorage.setItem(STORAGE_DISMISS, '1')
  unmountLiveActivityPanel()
}

// ── Route-based visibility ──

function currentRoute() {
  return location.hash.replace('#/', '').replace('#', '').split('?')[0].split('/')[0] || ''
}

function applyRouteVisibility() {
  if (!rootEl) return
  const hideForRoute = HIDDEN_ROUTES.has(currentRoute())
  rootEl.classList.toggle('lap--route-hidden', hideForRoute)
}

// ── SSE ──

function connectSSE() {
  if (eventSource) eventSource.close()
  eventSource = new EventSource('/api/spotify/stream')
  eventSource.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data)
      applyState(data)
    } catch (_) {}
  }
  eventSource.onerror = () => {
    eventSource.close()
    eventSource = null
    setTimeout(() => {
      fetch('/api/spotify/now-playing')
        .then(r => r.json()).then(applyState).catch(() => {})
      connectSSE()
    }, 15_000)
  }
}

function applyState(data) {
  lastState = data
  if (!rootEl) return

  const dot      = rootEl.querySelector('#lap-dot')
  const label    = rootEl.querySelector('#lap-header-label')
  const art      = rootEl.querySelector('#lap-art')
  const glow     = rootEl.querySelector('#lap-art-glow')
  const trackEl  = rootEl.querySelector('#lap-track')
  const artistEl = rootEl.querySelector('#lap-artist')
  const albumEl  = rootEl.querySelector('#lap-album')
  const link     = rootEl.querySelector('#lap-open-link')
  const eqEl     = rootEl.querySelector('#lap-eq')

  if (data.reason === 'not_configured') {
    rootEl.classList.add('lap--unavailable')
    return
  }
  rootEl.classList.remove('lap--unavailable')

  const hasTrack = !!(data.track)
  isPlaying = data.playing

  // Hide entirely when nothing playing and no cached track
  if (!hasTrack) {
    rootEl.classList.add('lap--hidden')
    clearInterval(progressTimer)
    lastTrackUrl = null
    return
  }
  rootEl.classList.remove('lap--hidden')

  // Header state
  if (isPlaying) {
    dot.className = 'lap-dot lap-dot--live'
    label.textContent = 'Now Playing'
  } else if (data.paused) {
    dot.className = 'lap-dot lap-dot--paused'
    label.textContent = 'Paused'
  } else {
    dot.className = 'lap-dot lap-dot--off'
    label.textContent = 'Offline'
  }
  eqEl.className = isPlaying ? 'lap-eq lap-eq--active' : 'lap-eq'

  const { track } = data
  const trackChanged = track.url !== lastTrackUrl
  lastTrackUrl = track.url

  trackEl.textContent  = track.name
  artistEl.textContent = track.artist
  albumEl.textContent  = track.album || ''
  link.href = track.url || '#'

  if (track.albumArt) {
    art.style.backgroundImage  = `url(${track.albumArt})`
    glow.style.backgroundImage = `url(${track.albumArt})`
    if (trackChanged) {
      art.style.animation = 'none'
      void art.offsetWidth
      art.style.animation = 'lap-art-in 0.5s cubic-bezier(.2,.8,.2,1)'
      extractDominantColor(track.albumArt)
    }
  }

  currentProgress = track.progress_ms || 0
  currentDuration = track.duration_ms || 1
  updateProgress()

  clearInterval(progressTimer)
  if (isPlaying) {
    progressTimer = setInterval(() => {
      currentProgress += 1000
      if (currentProgress > currentDuration) currentProgress = currentDuration
      updateProgress()
    }, 1000)
  }

  // Re-apply marquee in case the track name changed
  requestAnimationFrame(applyPanelMarquee)
}

function updateProgress() {
  if (!rootEl) return
  const fill    = rootEl.querySelector('#lap-bar-fill')
  const timeCur = rootEl.querySelector('#lap-time-cur')
  const timeTot = rootEl.querySelector('#lap-time-tot')
  const pct = Math.max(0, Math.min(100, (currentProgress / currentDuration) * 100))
  if (fill)    fill.style.width = `${pct}%`
  if (timeCur) timeCur.textContent = fmtMs(currentProgress)
  if (timeTot) timeTot.textContent = fmtMs(currentDuration)
}

function fmtMs(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Track-name marquee (expanded state only) ──

function applyPanelMarquee() {
  if (!rootEl) return
  const trackEl = rootEl.querySelector('#lap-track')
  const vp      = trackEl?.parentElement
  if (!trackEl || !vp || !rootEl.classList.contains('lap--expanded')) return

  const overflow = trackEl.scrollWidth - vp.clientWidth
  trackEl.classList.remove('lap-track--marquee')
  trackEl.style.removeProperty('--lap-marquee-shift')
  if (overflow > 6) {
    trackEl.style.setProperty('--lap-marquee-shift', `-${overflow + 10}px`)
    trackEl.classList.add('lap-track--marquee')
  }
}

function clearPanelMarquee() {
  if (!rootEl) return
  const trackEl = rootEl.querySelector('#lap-track')
  if (!trackEl) return
  trackEl.classList.remove('lap-track--marquee')
  trackEl.style.removeProperty('--lap-marquee-shift')
}

// ── Dominant color (tiny, CORS-tolerant) ──

function extractDominantColor(url) {
  if (!rootEl) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const c = document.createElement('canvas')
      c.width = 12; c.height = 12
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, 12, 12)
      const { data } = ctx.getImageData(0, 0, 12, 12)
      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < data.length; i += 4) {
        const rr = data[i], gg = data[i + 1], bb = data[i + 2]
        const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
        if (max - min < 18) continue
        r += rr; g += gg; b += bb; n++
      }
      if (n === 0) return
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n)
      rootEl.style.setProperty('--lap-glow',       `rgba(${r},${g},${b},0.6)`)
      rootEl.style.setProperty('--lap-glow-faint',  `rgba(${r},${g},${b},0.15)`)
    } catch (_) { /* CORS fail — keep default */ }
  }
  img.src = url
}

// ── Styles ──

function injectStyles() {
  if (document.getElementById('lap-css')) return
  const el = document.createElement('style')
  el.id = 'lap-css'
  el.textContent = `
    #live-activity-root {
      --lap-green: #1DB954;
      --lap-glow: rgba(30,215,96,0.45);
      --lap-glow-faint: rgba(30,215,96,0.15);
      position: fixed;
      right: 20px;
      bottom: 20px;
      z-index: 7000;
      pointer-events: none;
      transition: opacity 0.4s, transform 0.4s;
    }
    #live-activity-root.lap--hidden,
    #live-activity-root.lap--unavailable,
    #live-activity-root.lap--route-hidden {
      opacity: 0;
      pointer-events: none !important;
      transform: translateY(12px) scale(0.96);
    }
    #live-activity-root:not(.lap--hidden):not(.lap--unavailable):not(.lap--route-hidden) {
      opacity: 1;
      transform: translateY(0);
    }

    /* Pulse ring behind card when live */
    .lap-pulse {
      position: absolute;
      inset: -6px;
      border-radius: 20px;
      background: radial-gradient(closest-side, var(--lap-glow-faint), transparent 70%);
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.5s;
    }
    #live-activity-root:has(.lap-dot--live) .lap-pulse {
      opacity: 1;
      animation: lap-pulse 2.4s ease-in-out infinite;
    }

    .lap-card {
      position: relative;
      pointer-events: auto;
      width: 250px;
      background: rgba(12,18,28,0.82);
      -webkit-backdrop-filter: blur(16px) saturate(1.4);
              backdrop-filter: blur(16px) saturate(1.4);
      border: 1px solid var(--border, rgba(255,255,255,0.08));
      border-radius: 14px;
      padding: 10px 12px;
      overflow: hidden;
      cursor: pointer;
      transition: width 0.35s cubic-bezier(.2,.8,.2,1),
                  border-color 0.4s,
                  box-shadow 0.4s,
                  transform 0.3s;
      box-shadow: 0 10px 30px -8px rgba(0,0,0,0.6);
    }
    [data-theme="light"] .lap-card {
      background: rgba(255,255,255,0.85);
    }
    #live-activity-root:has(.lap-dot--live) .lap-card {
      border-color: var(--lap-glow);
      box-shadow: 0 18px 40px -15px var(--lap-glow);
    }
    .lap-card::before {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--lap-glow-faint), transparent 60%);
      pointer-events: none;
      opacity: 0.6;
    }

    #live-activity-root.lap--expanded .lap-card {
      width: 320px;
      transform: translateY(-2px);
    }

    /* Close button */
    .lap-close {
      position: absolute;
      top: 6px;
      right: 8px;
      background: transparent;
      border: none;
      color: var(--muted, #888);
      width: 20px;
      height: 20px;
      border-radius: 50%;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s, background 0.2s, color 0.2s;
      pointer-events: none;
      z-index: 2;
    }
    #live-activity-root.lap--expanded .lap-close,
    .lap-card:hover .lap-close {
      opacity: 0.6;
      pointer-events: auto;
    }
    .lap-close:hover {
      opacity: 1;
      color: var(--red, #f87171);
      background: rgba(248,113,113,0.1);
    }

    /* Header */
    .lap-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      padding-right: 20px;
      position: relative;
      z-index: 1;
    }
    .lap-header-label {
      font-size: 0.6rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted, #888);
      transition: color 0.3s;
    }
    #live-activity-root:has(.lap-dot--live) .lap-header-label {
      color: var(--lap-green);
    }
    .lap-header-spacer { flex: 1; }

    .lap-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--muted, #555);
    }
    .lap-dot--live {
      background: var(--lap-green);
      box-shadow: 0 0 6px rgba(30,215,96,0.6);
      animation: lap-dot-pulse 1.8s ease-in-out infinite;
    }
    .lap-dot--paused { background: #f5a623; }

    /* Mini EQ */
    .lap-eq {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 10px;
    }
    .lap-eq span {
      width: 2px;
      background: var(--lap-green);
      border-radius: 1px;
      height: 2px;
    }
    .lap-eq--active span:nth-child(1) { animation: lap-eq1 0.7s ease-in-out infinite; }
    .lap-eq--active span:nth-child(2) { animation: lap-eq2 0.8s ease-in-out infinite 0.1s; }
    .lap-eq--active span:nth-child(3) { animation: lap-eq3 0.6s ease-in-out infinite 0.25s; }

    /* Body */
    .lap-body {
      display: flex;
      align-items: center;
      gap: 10px;
      position: relative;
      z-index: 1;
    }

    /* Art wrap — grows slightly on expand */
    .lap-art-wrap {
      position: relative;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      transition: width 0.35s cubic-bezier(.2,.8,.2,1),
                  height 0.35s cubic-bezier(.2,.8,.2,1);
    }
    #live-activity-root.lap--expanded .lap-art-wrap {
      width: 52px;
      height: 52px;
    }

    /* Spinning conic ring — visible when playing */
    .lap-vinyl-ring {
      position: absolute;
      top: -3px; left: -3px;
      width: calc(100% + 6px);
      height: calc(100% + 6px);
      border-radius: 12px;
      background: conic-gradient(
        var(--lap-glow) 0deg,
        transparent 100deg,
        transparent 260deg,
        var(--lap-glow) 360deg
      );
      opacity: 0;
      z-index: 0;
      transition: opacity 0.4s;
      pointer-events: none;
    }
    #live-activity-root:has(.lap-dot--live) .lap-vinyl-ring {
      opacity: 1;
      animation: lap-ring-spin 2.5s linear infinite;
    }
    #live-activity-root:has(.lap-dot--paused) .lap-vinyl-ring {
      opacity: 0.35;
      animation: none;
    }

    .lap-art {
      position: absolute;
      inset: 0;
      border-radius: 8px;
      background-size: cover;
      background-position: center;
      background-color: rgba(30,215,96,0.1);
      box-shadow: 0 4px 12px -4px rgba(0,0,0,0.6);
      z-index: 1;
      transition: border-radius 0.35s cubic-bezier(.2,.8,.2,1);
    }
    #live-activity-root.lap--expanded .lap-art { border-radius: 10px; }
    .lap-art-glow {
      position: absolute;
      inset: -4px;
      border-radius: 10px;
      background-size: cover;
      background-position: center;
      filter: blur(14px) saturate(1.7);
      opacity: 0.55;
      z-index: 0;
      transition: opacity 0.4s;
    }
    #live-activity-root:has(.lap-dot--paused) .lap-art-glow { opacity: 0.2; }
    #live-activity-root:has(.lap-dot--off) .lap-art-glow    { opacity: 0; }

    /* Info column */
    .lap-info {
      flex: 1;
      min-width: 0;
    }

    /* Track name with marquee viewport */
    .lap-track-vp {
      overflow: hidden;
      position: relative;
    }
    .lap-track {
      font-family: var(--font-head, sans-serif);
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--text, #fff);
      white-space: nowrap;
      display: inline-block;
      line-height: 1.2;
      --lap-marquee-shift: -60px;
    }
    .lap-track--marquee {
      animation: lap-track-marquee 9s linear infinite;
    }
    @keyframes lap-track-marquee {
      0%, 25%  { transform: translateX(0); }
      65%, 90% { transform: translateX(var(--lap-marquee-shift)); }
      100%     { transform: translateX(0); }
    }

    .lap-artist {
      font-size: 0.66rem;
      color: var(--muted, #888);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
    }

    /* Album name — slides in on expand */
    .lap-album {
      font-size: 0.6rem;
      color: var(--muted, #888);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-style: italic;
      max-height: 0;
      opacity: 0;
      margin-top: 0;
      transition: max-height 0.3s ease, opacity 0.3s ease, margin-top 0.25s ease;
    }
    #live-activity-root.lap--expanded .lap-album {
      max-height: 18px;
      opacity: 0.75;
      margin-top: 1px;
    }

    /* Mini progress bar */
    .lap-bar {
      height: 2px;
      background: rgba(255,255,255,0.08);
      border-radius: 1px;
      margin-top: 7px;
      overflow: hidden;
      opacity: 0;
      transition: opacity 0.3s, margin-top 0.3s;
    }
    #live-activity-root.lap--expanded .lap-bar {
      opacity: 1;
    }
    .lap-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--lap-green), var(--lap-glow));
      border-radius: 1px;
      transition: width 1s linear;
      box-shadow: 0 0 4px var(--lap-glow);
    }

    /* Elapsed / total timestamps — slide in on expand */
    .lap-times {
      display: flex;
      justify-content: space-between;
      font-size: 0.58rem;
      color: var(--muted, #888);
      font-variant-numeric: tabular-nums;
      font-family: var(--font-mono, monospace);
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      margin-top: 0;
      transition: max-height 0.3s ease, opacity 0.3s ease, margin-top 0.25s ease;
    }
    #live-activity-root.lap--expanded .lap-times {
      max-height: 18px;
      opacity: 0.7;
      margin-top: 3px;
    }

    /* Open link (only in expanded) */
    .lap-open-link {
      position: absolute;
      bottom: 10px;
      right: 12px;
      color: var(--lap-green);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s, transform 0.2s;
      z-index: 2;
    }
    #live-activity-root.lap--expanded .lap-open-link {
      opacity: 0.7;
      pointer-events: auto;
    }
    .lap-open-link:hover { opacity: 1; transform: scale(1.12); }

    /* Animations */
    @keyframes lap-pulse {
      0%, 100% { transform: scale(1);    opacity: 1; }
      50%      { transform: scale(1.05); opacity: 0.8; }
    }
    @keyframes lap-dot-pulse {
      0%, 100% { box-shadow: 0 0 6px rgba(30,215,96,0.6); }
      50%      { box-shadow: 0 0 12px rgba(30,215,96,1); }
    }
    @keyframes lap-eq1 { 0%,100% { height: 2px; } 50% { height: 9px;  } }
    @keyframes lap-eq2 { 0%,100% { height: 4px; } 50% { height: 7px;  } }
    @keyframes lap-eq3 { 0%,100% { height: 2px; } 50% { height: 10px; } }
    @keyframes lap-art-in {
      from { opacity: 0; transform: scale(0.7) rotate(-8deg); }
      to   { opacity: 1; transform: scale(1)   rotate(0);     }
    }
    @keyframes lap-ring-spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 600px) {
      #live-activity-root {
        right: 12px;
        bottom: 12px;
      }
      .lap-card { width: 220px; padding: 8px 10px; }
      #live-activity-root.lap--expanded .lap-card { width: 270px; }
      .lap-art-wrap { width: 36px; height: 36px; }
      #live-activity-root.lap--expanded .lap-art-wrap { width: 46px; height: 46px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .lap-pulse,
      .lap-dot--live,
      .lap-vinyl-ring,
      .lap-track--marquee,
      .lap-eq--active span { animation: none !important; }
    }
  `
  document.head.appendChild(el)
}
