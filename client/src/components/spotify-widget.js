// ── Spotify "Now Playing" — Live Activity Widget (home-page, decorated) ──
// Uses SSE (/api/spotify/stream) for near-instant updates.
// Falls back to REST polling if SSE fails.
// Shows:
//   - Spinning vinyl disc behind album art (stops on pause)
//   - Color-adaptive glow extracted from album art
//   - Marquee for long track names
//   - Crossfade on track change
//   - Animated progress bar + equalizer
//   - Recent tracks / Top tracks strip with tab toggle

let eventSource     = null
let progressTimer   = null
let currentProgress = 0
let currentDuration = 0
let isPlaying       = false
let lastTrackUrl    = null
let recentTimer     = null
let activeTab       = 'recent'

export function mountSpotifyWidget(container) {
  activeTab = 'recent'

  container.innerHTML = `
    <div class="sp-activity" id="sp-activity">
      <div class="sp-activity-inner">

        <div class="sp-header">
          <div class="sp-dot" id="sp-dot"></div>
          <span class="sp-header-label" id="sp-header-label">Live Activity</span>
          <span class="sp-header-spacer"></span>
          <span class="sp-header-right">
            <span class="sp-eq" id="sp-eq">
              <span></span><span></span><span></span><span></span>
            </span>
          </span>
        </div>

        <div class="sp-body" id="sp-body">
          <div class="sp-art-wrap" id="sp-art-wrap">
            <div class="sp-vinyl" id="sp-vinyl">
              <div class="sp-vinyl-grooves"></div>
              <div class="sp-vinyl-center"></div>
            </div>
            <div class="sp-art" id="sp-art"></div>
            <div class="sp-art-glow" id="sp-art-glow"></div>
          </div>

          <div class="sp-details">
            <div class="sp-track-row">
              <div class="sp-track-viewport">
                <div class="sp-track" id="sp-track">Not listening</div>
              </div>
            </div>
            <div class="sp-artist" id="sp-artist">Spotify</div>
            <div class="sp-progress-wrap" id="sp-progress-wrap">
              <div class="sp-bar">
                <div class="sp-bar-fill" id="sp-bar-fill"></div>
                <div class="sp-bar-glow" id="sp-bar-glow"></div>
              </div>
              <div class="sp-times">
                <span id="sp-time-cur">0:00</span>
                <span id="sp-time-tot">0:00</span>
              </div>
            </div>
          </div>

          <a class="sp-open" id="sp-open" href="#" target="_blank" rel="noopener" title="Open in Spotify">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>
          </a>
        </div>

        <!-- Recent / Top tracks strip -->
        <div class="sp-recent" id="sp-recent" hidden>
          <div class="sp-recent-nav">
            <button class="sp-tab sp-tab--active" data-tab="recent">Recently played</button>
            <button class="sp-tab" data-tab="top">Top tracks</button>
          </div>
          <div class="sp-recent-scroll" id="sp-recent-scroll"></div>
        </div>

      </div>
    </div>
  `

  injectStyles()
  connectSSE()
  loadRecent()

  // Refresh recent every 2 min (only when that tab is active)
  clearInterval(recentTimer)
  recentTimer = setInterval(() => {
    if (activeTab === 'recent') loadRecent()
  }, 120_000)

  // Wire tab buttons
  container.querySelectorAll('.sp-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab
      if (tab === activeTab) return
      activeTab = tab

      container.querySelectorAll('.sp-tab').forEach(b => b.classList.toggle('sp-tab--active', b.dataset.tab === tab))

      if (tab === 'recent') {
        loadRecent()
      } else {
        loadTopTracks()
      }
    })
  })
}

export function unmountSpotifyWidget() {
  if (eventSource) { eventSource.close(); eventSource = null }
  clearInterval(progressTimer)
  clearInterval(recentTimer)
}

// ── SSE connection ──

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
        .then(r => r.json())
        .then(applyState)
        .catch(() => {})
      connectSSE()
    }, 15_000)
  }
}

// ── Apply state from SSE or REST ──

function applyState(data) {
  const panel     = document.getElementById('sp-activity')
  const dot       = document.getElementById('sp-dot')
  const label     = document.getElementById('sp-header-label')
  const body      = document.getElementById('sp-body')
  const artEl     = document.getElementById('sp-art')
  const glowEl    = document.getElementById('sp-art-glow')
  const vinylEl   = document.getElementById('sp-vinyl')
  const trackEl   = document.getElementById('sp-track')
  const artistEl  = document.getElementById('sp-artist')
  const eqEl      = document.getElementById('sp-eq')
  const linkEl    = document.getElementById('sp-open')
  const progWrap  = document.getElementById('sp-progress-wrap')

  if (!panel) return

  if (data.reason === 'not_configured') {
    panel.style.display = 'none'
    return
  }
  panel.style.display = ''

  const hasTrack = !!(data.track)
  isPlaying = data.playing

  // Header state
  if (isPlaying) {
    dot.className = 'sp-dot sp-dot--live'
    label.textContent = 'Now Playing'
  } else if (data.paused && hasTrack) {
    dot.className = 'sp-dot sp-dot--paused'
    label.textContent = 'Paused'
  } else {
    dot.className = 'sp-dot sp-dot--off'
    label.textContent = 'Offline'
  }

  eqEl.className = isPlaying ? 'sp-eq sp-eq--active' : 'sp-eq'

  // Vinyl spin state
  vinylEl.classList.toggle('sp-vinyl--spinning', isPlaying)

  if (hasTrack) {
    const { track } = data
    body.className = 'sp-body sp-body--has-track'

    const trackChanged = track.url !== lastTrackUrl
    lastTrackUrl = track.url

    if (trackChanged) {
      // Crossfade the art
      artEl.classList.remove('sp-art--in')
      void artEl.offsetWidth
      artEl.classList.add('sp-art--in')

      // Animate track name
      trackEl.style.animation = 'none'
      void trackEl.offsetWidth
      trackEl.style.animation = 'sp-slide-in 0.45s cubic-bezier(.2,.8,.2,1)'
    }

    trackEl.textContent = track.name
    artistEl.textContent = `${track.artist} · ${track.album}`
    linkEl.href = track.url || '#'
    linkEl.style.display = ''

    if (track.albumArt) {
      artEl.style.backgroundImage = `url(${track.albumArt})`
      glowEl.style.backgroundImage = `url(${track.albumArt})`
      if (trackChanged) extractDominantColor(track.albumArt)
    }

    // Marquee if overflowing
    requestAnimationFrame(() => applyMarquee(trackEl))

    progWrap.style.display = ''
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
  } else {
    body.className = 'sp-body'
    trackEl.textContent = 'Not listening right now'
    artistEl.textContent = 'Spotify'
    artEl.style.backgroundImage = 'none'
    glowEl.style.backgroundImage = 'none'
    linkEl.style.display = 'none'
    progWrap.style.display = 'none'
    clearInterval(progressTimer)
    lastTrackUrl = null
    panel.style.setProperty('--sp-glow', 'rgba(30,215,96,0.35)')
  }
}

function updateProgress() {
  const fill = document.getElementById('sp-bar-fill')
  const glow = document.getElementById('sp-bar-glow')
  const cur  = document.getElementById('sp-time-cur')
  const tot  = document.getElementById('sp-time-tot')
  const pct  = Math.max(0, Math.min(100, (currentProgress / currentDuration) * 100))
  if (fill) fill.style.width = `${pct}%`
  if (glow) glow.style.left = `${pct}%`
  if (cur) cur.textContent = fmtMs(currentProgress)
  if (tot) tot.textContent = fmtMs(currentDuration)
}

function fmtMs(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Marquee (only when overflowing) ──

function applyMarquee(trackEl) {
  const viewport = trackEl.parentElement
  if (!viewport) return
  const overflow = trackEl.scrollWidth - viewport.clientWidth
  trackEl.classList.remove('sp-track--marquee')
  trackEl.style.setProperty('--sp-marquee-shift', '0px')
  if (overflow > 6) {
    trackEl.style.setProperty('--sp-marquee-shift', `-${overflow + 16}px`)
    trackEl.classList.add('sp-track--marquee')
  }
}

// ── Dominant color extraction (tiny, sync-ish) ──

function extractDominantColor(url) {
  const panel = document.getElementById('sp-activity')
  if (!panel) return
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    try {
      const c = document.createElement('canvas')
      c.width = 16; c.height = 16
      const ctx = c.getContext('2d')
      ctx.drawImage(img, 0, 0, 16, 16)
      const { data } = ctx.getImageData(0, 0, 16, 16)
      let r = 0, g = 0, b = 0, n = 0
      for (let i = 0; i < data.length; i += 4) {
        const rr = data[i], gg = data[i + 1], bb = data[i + 2]
        // Skip near-black/near-white pixels — they wash out the glow
        const max = Math.max(rr, gg, bb), min = Math.min(rr, gg, bb)
        if (max - min < 18) continue
        r += rr; g += gg; b += bb; n++
      }
      if (n === 0) return
      r = Math.round(r / n); g = Math.round(g / n); b = Math.round(b / n)
      // Boost saturation a touch
      panel.style.setProperty('--sp-glow', `rgba(${r},${g},${b},0.55)`)
      panel.style.setProperty('--sp-glow-faint', `rgba(${r},${g},${b},0.18)`)
    } catch (_) {
      // CORS on album art from i.scdn.co — fail silently, keep default glow
    }
  }
  img.src = url
}

// ── Recent tracks strip ──

async function loadRecent() {
  const wrap   = document.getElementById('sp-recent')
  const scroll = document.getElementById('sp-recent-scroll')
  if (!wrap || !scroll) return
  try {
    const res = await fetch('/api/spotify/recent-tracks?limit=6')
    const data = await res.json()
    const tracks = Array.isArray(data.tracks) ? data.tracks : []
    if (tracks.length === 0) {
      wrap.hidden = true
      return
    }
    wrap.hidden = false
    scroll.innerHTML = tracks.map(t => `
      <a class="sp-recent-card" href="${t.url || '#'}" target="_blank" rel="noopener" title="${escapeHtml(t.name)} — ${escapeHtml(t.artist)}">
        <div class="sp-recent-art" style="background-image:url(${t.albumArt || ''})"></div>
        <div class="sp-recent-meta">
          <div class="sp-recent-name">${escapeHtml(t.name)}</div>
          <div class="sp-recent-artist">${escapeHtml(t.artist)}</div>
        </div>
      </a>
    `).join('')
  } catch (_) {
    const wrap = document.getElementById('sp-recent')
    if (wrap) wrap.hidden = true
  }
}

// ── Top tracks strip ──

async function loadTopTracks() {
  const wrap   = document.getElementById('sp-recent')
  const scroll = document.getElementById('sp-recent-scroll')
  if (!wrap || !scroll) return

  // Show loading state
  scroll.innerHTML = '<div class="sp-tracks-loading"><span></span><span></span><span></span></div>'
  wrap.hidden = false

  try {
    const res = await fetch('/api/spotify/top-tracks?range=short_term&limit=8')
    const data = await res.json()
    const tracks = Array.isArray(data.tracks) ? data.tracks : []
    if (tracks.length === 0) {
      scroll.innerHTML = '<div class="sp-tracks-empty">No top tracks yet</div>'
      return
    }
    scroll.innerHTML = tracks.map((t, i) => `
      <a class="sp-recent-card" href="${t.url || '#'}" target="_blank" rel="noopener" title="${escapeHtml(t.name)} — ${escapeHtml(t.artist)}">
        <div class="sp-recent-art" style="background-image:url(${t.albumArt || ''})">
          <div class="sp-top-rank">${i + 1}</div>
        </div>
        <div class="sp-recent-meta">
          <div class="sp-recent-name">${escapeHtml(t.name)}</div>
          <div class="sp-recent-artist">${escapeHtml(t.artist)}</div>
        </div>
      </a>
    `).join('')
  } catch (_) {
    scroll.innerHTML = '<div class="sp-tracks-empty">Could not load</div>'
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
}

// ── Styles ──

function injectStyles() {
  if (document.getElementById('sp-widget-css')) return
  const el = document.createElement('style')
  el.id = 'sp-widget-css'
  el.textContent = `
    /* ── Live Activity Panel (home) ── */
    .sp-activity {
      --sp-green: #1DB954;
      --sp-glow: rgba(30,215,96,0.35);
      --sp-glow-faint: rgba(30,215,96,0.1);
    }
    .sp-activity-inner {
      border-radius: 18px;
      background:
        radial-gradient(120% 160% at 0% 0%, var(--sp-glow-faint), transparent 55%),
        var(--card-bg, rgba(255,255,255,0.03));
      border: 1px solid var(--border, rgba(255,255,255,0.06));
      overflow: hidden;
      position: relative;
      transition: border-color 0.5s, box-shadow 0.5s, background 0.5s;
    }
    .sp-activity-inner::before {
      content: '';
      position: absolute;
      inset: -1px;
      border-radius: inherit;
      padding: 1px;
      background: linear-gradient(135deg, var(--sp-glow), transparent 40%, transparent 60%, var(--sp-glow) 100%);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
              mask-composite: exclude;
      opacity: 0;
      transition: opacity 0.6s;
      pointer-events: none;
    }
    .sp-activity-inner:has(.sp-dot--live)::before { opacity: 0.8; }
    .sp-activity-inner:has(.sp-dot--live) {
      box-shadow: 0 20px 50px -20px var(--sp-glow);
    }

    /* Header */
    .sp-header {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 20px 0;
    }
    .sp-header-spacer { flex: 1; }
    .sp-header-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted, #888);
    }
    .sp-activity-inner:has(.sp-dot--live) .sp-header-label {
      color: var(--sp-green);
    }

    /* Status dot */
    .sp-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--muted, #555);
      transition: background 0.3s;
    }
    .sp-dot--live {
      background: var(--sp-green);
      box-shadow: 0 0 8px rgba(30, 215, 96, 0.6);
      animation: sp-pulse 1.8s ease-in-out infinite;
    }
    .sp-dot--paused { background: #f5a623; }
    .sp-dot--off    { background: var(--muted, #555); }

    /* Equalizer bars (header) */
    .sp-eq {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 14px;
      flex-shrink: 0;
    }
    .sp-eq span {
      display: block;
      width: 3px;
      background: var(--sp-green);
      border-radius: 1px;
      height: 3px;
      transition: height 0.2s;
    }
    .sp-eq--active span:nth-child(1) { animation: sp-eq1 0.8s ease-in-out infinite; }
    .sp-eq--active span:nth-child(2) { animation: sp-eq2 0.7s ease-in-out infinite 0.12s; }
    .sp-eq--active span:nth-child(3) { animation: sp-eq3 0.9s ease-in-out infinite 0.25s; }
    .sp-eq--active span:nth-child(4) { animation: sp-eq1 0.75s ease-in-out infinite 0.4s; }

    /* Body */
    .sp-body {
      display: flex;
      align-items: center;
      gap: 18px;
      padding: 16px 20px 18px;
      position: relative;
    }

    /* Art + vinyl + glow */
    .sp-art-wrap {
      position: relative;
      flex-shrink: 0;
      width: 64px;
      height: 64px;
    }

    /* Vinyl disc — sits under art, pokes out slightly */
    .sp-vinyl {
      position: absolute;
      inset: 0;
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: radial-gradient(circle at 50% 50%, #1a1a1a 0 22%, #0a0a0a 23% 100%);
      transform: translateX(12px) rotate(0deg);
      transition: transform 0.5s cubic-bezier(.2,.8,.2,1), opacity 0.4s;
      opacity: 0;
      z-index: 0;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04);
    }
    .sp-body--has-track .sp-vinyl { opacity: 1; transform: translateX(26px) rotate(0deg); }
    .sp-vinyl--spinning { animation: sp-vinyl-spin 5s linear infinite; animation-play-state: running; }
    .sp-vinyl-grooves {
      position: absolute; inset: 6px;
      border-radius: 50%;
      background: repeating-radial-gradient(circle at 50% 50%,
        transparent 0 2px,
        rgba(255,255,255,0.04) 2px 3px);
      opacity: 0.7;
    }
    .sp-vinyl-center {
      position: absolute;
      left: 50%; top: 50%;
      width: 14px; height: 14px;
      border-radius: 50%;
      background: var(--sp-glow, #1DB954);
      transform: translate(-50%, -50%);
      box-shadow: 0 0 0 1px rgba(0,0,0,0.6), 0 0 6px var(--sp-glow);
    }

    .sp-art {
      position: absolute;
      inset: 0;
      width: 64px;
      height: 64px;
      border-radius: 12px;
      background-size: cover;
      background-position: center;
      background-color: rgba(30, 215, 96, 0.08);
      z-index: 1;
      transition: transform 0.35s cubic-bezier(.2,.8,.2,1);
      box-shadow: 0 6px 20px -8px rgba(0,0,0,0.6);
    }
    .sp-body--has-track:hover .sp-art { transform: scale(1.04) rotate(-1deg); }

    /* Crossfade in */
    .sp-art--in { animation: sp-art-in 0.5s cubic-bezier(.2,.8,.2,1); }

    .sp-art-glow {
      position: absolute;
      inset: -8px;
      border-radius: 18px;
      background-size: cover;
      background-position: center;
      filter: blur(22px) saturate(1.8);
      opacity: 0;
      z-index: -1;
      transition: opacity 0.5s;
    }
    .sp-body--has-track .sp-art-glow { opacity: 0.45; }
    .sp-activity-inner:has(.sp-dot--paused) .sp-art-glow { opacity: 0.2; }
    .sp-activity-inner:has(.sp-dot--off) .sp-art-glow    { opacity: 0; }

    /* Details */
    .sp-details { flex: 1; min-width: 0; }
    .sp-track-row { display: flex; align-items: center; gap: 8px; }
    .sp-track-viewport {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      position: relative;
    }
    .sp-track {
      font-family: var(--font-head, sans-serif);
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--text, #fff);
      white-space: nowrap;
      display: inline-block;
      --sp-marquee-shift: 0px;
    }
    .sp-track--marquee {
      animation: sp-marquee 10s linear infinite;
    }
    @keyframes sp-marquee {
      0%        { transform: translateX(0); }
      40%       { transform: translateX(0); }
      70%       { transform: translateX(var(--sp-marquee-shift)); }
      95%       { transform: translateX(var(--sp-marquee-shift)); }
      100%      { transform: translateX(0); }
    }

    .sp-artist {
      font-size: 0.76rem;
      color: var(--muted, #888);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 2px;
      margin-bottom: 10px;
    }

    /* Progress */
    .sp-progress-wrap { display: flex; flex-direction: column; gap: 4px; }
    .sp-bar {
      position: relative;
      height: 4px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      overflow: visible;
    }
    .sp-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--sp-green) 0%, var(--sp-glow) 100%);
      border-radius: 2px;
      transition: width 1s linear;
      box-shadow: 0 0 8px -1px var(--sp-glow);
    }
    .sp-bar-glow {
      position: absolute;
      top: 50%; left: 0;
      width: 10px; height: 10px;
      background: var(--sp-green);
      border-radius: 50%;
      transform: translate(-50%, -50%);
      box-shadow: 0 0 10px var(--sp-green);
      opacity: 0;
      transition: opacity 0.3s, left 1s linear;
    }
    .sp-activity-inner:has(.sp-dot--live) .sp-bar-glow { opacity: 1; }

    .sp-times {
      display: flex;
      justify-content: space-between;
      font-size: 0.66rem;
      color: var(--muted, #888);
      font-variant-numeric: tabular-nums;
      font-family: var(--font-mono, monospace);
    }

    /* Open in Spotify */
    .sp-open {
      position: absolute;
      top: 14px;
      right: 20px;
      color: var(--sp-green);
      opacity: 0;
      transform: translateY(-2px);
      transition: opacity 0.2s, transform 0.2s;
    }
    .sp-activity-inner:hover .sp-open { opacity: 0.7; transform: translateY(0); }
    .sp-open:hover { opacity: 1 !important; transform: scale(1.08) !important; }

    /* ── Recent / Top tracks strip ── */
    .sp-recent {
      border-top: 1px solid var(--border, rgba(255,255,255,0.06));
      padding: 12px 20px 14px;
    }

    /* Tab nav */
    .sp-recent-nav {
      display: flex;
      gap: 6px;
      margin-bottom: 10px;
    }
    .sp-tab {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 20px;
      padding: 3px 11px;
      font-size: 0.61rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted, #888);
      cursor: pointer;
      transition: background 0.2s, border-color 0.2s, color 0.2s;
      font-family: var(--font-body, sans-serif);
    }
    .sp-tab:hover {
      background: rgba(255,255,255,0.04);
      color: var(--text, #fff);
      border-color: rgba(255,255,255,0.14);
    }
    .sp-tab--active {
      background: rgba(30,215,96,0.12);
      border-color: rgba(30,215,96,0.3);
      color: var(--sp-green);
    }

    /* Cards row */
    .sp-recent-scroll {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      padding-bottom: 4px;
      scrollbar-width: none;
    }
    .sp-recent-scroll::-webkit-scrollbar { display: none; }
    .sp-recent-card {
      flex: 0 0 auto;
      width: 140px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px;
      border-radius: 10px;
      background: rgba(255,255,255,0.02);
      border: 1px solid rgba(255,255,255,0.04);
      text-decoration: none;
      color: inherit;
      scroll-snap-align: start;
      transition: background 0.2s, border-color 0.2s, transform 0.2s;
    }
    .sp-recent-card:hover {
      background: rgba(30,215,96,0.06);
      border-color: rgba(30,215,96,0.25);
      transform: translateY(-2px);
    }
    .sp-recent-art {
      width: 32px; height: 32px;
      border-radius: 6px;
      background-size: cover;
      background-position: center;
      background-color: rgba(30,215,96,0.1);
      flex-shrink: 0;
      position: relative;
      overflow: hidden;
    }

    /* Rank badge on top-track cards */
    .sp-top-rank {
      position: absolute;
      bottom: 0; left: 0;
      background: rgba(0,0,0,0.65);
      color: #fff;
      font-size: 0.55rem;
      font-weight: 800;
      font-family: var(--font-mono, monospace);
      padding: 1px 4px;
      border-radius: 0 4px 0 0;
      line-height: 1.4;
    }

    .sp-recent-meta { flex: 1; min-width: 0; }
    .sp-recent-name {
      font-size: 0.74rem;
      font-weight: 600;
      color: var(--text, #fff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sp-recent-artist {
      font-size: 0.64rem;
      color: var(--muted, #888);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Loading skeleton */
    .sp-tracks-loading {
      display: flex;
      gap: 8px;
      padding: 4px 0;
    }
    .sp-tracks-loading span {
      display: block;
      width: 140px;
      height: 44px;
      border-radius: 10px;
      background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.03) 100%);
      background-size: 200% 100%;
      animation: sp-shimmer 1.4s ease-in-out infinite;
    }
    @keyframes sp-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }

    .sp-tracks-empty {
      font-size: 0.72rem;
      color: var(--muted, #888);
      padding: 6px 2px;
    }

    /* Animations */
    @keyframes sp-pulse {
      0%, 100% { box-shadow: 0 0 8px rgba(30,215,96,0.6); }
      50%      { box-shadow: 0 0 14px rgba(30,215,96,0.95); }
    }
    @keyframes sp-eq1 { 0%,100% { height: 3px; }  50% { height: 12px; } }
    @keyframes sp-eq2 { 0%,100% { height: 5px; }  50% { height: 10px; } }
    @keyframes sp-eq3 { 0%,100% { height: 2px; }  50% { height: 14px; } }
    @keyframes sp-slide-in {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes sp-art-in {
      from { opacity: 0; transform: scale(0.85) rotate(-6deg); filter: blur(4px); }
      to   { opacity: 1; transform: scale(1) rotate(0); filter: blur(0); }
    }
    @keyframes sp-vinyl-spin {
      from { transform: translateX(26px) rotate(0deg); }
      to   { transform: translateX(26px) rotate(360deg); }
    }

    @media (max-width: 480px) {
      .sp-body { padding: 14px 16px 14px; gap: 14px; }
      .sp-art-wrap, .sp-art, .sp-vinyl { width: 56px; height: 56px; }
      .sp-body--has-track .sp-vinyl { transform: translateX(22px); }
      @keyframes sp-vinyl-spin {
        from { transform: translateX(22px) rotate(0deg); }
        to   { transform: translateX(22px) rotate(360deg); }
      }
      .sp-recent { padding: 10px 14px 12px; }
      .sp-recent-card { width: 128px; }
    }

    @media (prefers-reduced-motion: reduce) {
      .sp-vinyl--spinning { animation: none; }
      .sp-track--marquee  { animation: none; }
      .sp-eq span         { animation: none !important; }
      .sp-tracks-loading span { animation: none; }
    }
  `
  document.head.appendChild(el)
}
