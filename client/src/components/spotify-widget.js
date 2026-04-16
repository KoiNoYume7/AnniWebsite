// ── Spotify "Now Playing" — Live Activity Widget ──
// Uses SSE (/api/spotify/stream) for near-instant updates.
// Falls back to REST polling if SSE fails.
// Shows album art with glow, track info, animated progress bar, and equalizer.

let eventSource = null
let progressTimer = null
let currentProgress = 0
let currentDuration = 0
let isPlaying = false
let lastTrackName = null

export function mountSpotifyWidget(container) {
  container.innerHTML = `
    <div class="sp-activity" id="sp-activity">
      <div class="sp-activity-inner">

        <div class="sp-header">
          <div class="sp-dot" id="sp-dot"></div>
          <span class="sp-header-label" id="sp-header-label">Live Activity</span>
        </div>

        <div class="sp-body" id="sp-body">
          <div class="sp-art-wrap" id="sp-art-wrap">
            <div class="sp-art" id="sp-art"></div>
            <div class="sp-art-glow" id="sp-art-glow"></div>
          </div>
          <div class="sp-details">
            <div class="sp-track-row">
              <div class="sp-track" id="sp-track">Not listening</div>
              <div class="sp-eq" id="sp-eq">
                <span></span><span></span><span></span>
              </div>
            </div>
            <div class="sp-artist" id="sp-artist">Spotify</div>
            <div class="sp-progress-wrap" id="sp-progress-wrap">
              <div class="sp-bar">
                <div class="sp-bar-fill" id="sp-bar-fill"></div>
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

      </div>
    </div>
  `

  injectStyles()
  connectSSE()
}

export function unmountSpotifyWidget() {
  if (eventSource) { eventSource.close(); eventSource = null }
  clearInterval(progressTimer)
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
    // SSE failed — fall back to one-off fetch, try reconnecting
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
  const trackEl   = document.getElementById('sp-track')
  const artistEl  = document.getElementById('sp-artist')
  const eqEl      = document.getElementById('sp-eq')
  const linkEl    = document.getElementById('sp-open')
  const progWrap  = document.getElementById('sp-progress-wrap')

  if (!panel) return

  // Not configured — hide entirely
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

  // Equalizer animation
  eqEl.className = isPlaying ? 'sp-eq sp-eq--active' : 'sp-eq'

  if (hasTrack) {
    const { track } = data
    body.className = 'sp-body sp-body--has-track'

    // Only animate track name change
    if (track.name !== lastTrackName) {
      trackEl.style.animation = 'none'
      trackEl.offsetHeight // force reflow
      trackEl.style.animation = 'sp-fade-in 0.3s ease'
    }
    lastTrackName = track.name

    trackEl.textContent = track.name
    artistEl.textContent = `${track.artist} · ${track.album}`
    linkEl.href = track.url || '#'
    linkEl.style.display = ''

    if (track.albumArt) {
      artEl.style.backgroundImage = `url(${track.albumArt})`
      glowEl.style.backgroundImage = `url(${track.albumArt})`
    }

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
    lastTrackName = null
  }
}

function updateProgress() {
  const fill = document.getElementById('sp-bar-fill')
  const cur  = document.getElementById('sp-time-cur')
  const tot  = document.getElementById('sp-time-tot')
  if (fill) fill.style.width = `${(currentProgress / currentDuration) * 100}%`
  if (cur) cur.textContent = fmtMs(currentProgress)
  if (tot) tot.textContent = fmtMs(currentDuration)
}

function fmtMs(ms) {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

// ── Styles ──

function injectStyles() {
  if (document.getElementById('sp-widget-css')) return
  const el = document.createElement('style')
  el.id = 'sp-widget-css'
  el.textContent = `
    /* ── Live Activity Panel ── */
    .sp-activity {
      padding: 0 24px;
    }
    .sp-activity-inner {
      max-width: 440px;
      margin: 0 auto;
      border-radius: 16px;
      background: var(--card-bg, rgba(255,255,255,0.03));
      border: 1px solid var(--border, rgba(255,255,255,0.06));
      overflow: hidden;
      transition: border-color 0.4s, box-shadow 0.4s;
    }
    .sp-activity-inner:has(.sp-dot--live) {
      border-color: rgba(30, 215, 96, 0.2);
      box-shadow: 0 0 30px -10px rgba(30, 215, 96, 0.1);
    }

    /* Header */
    .sp-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 18px 0;
    }
    .sp-header-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--muted, #888);
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
      background: #1DB954;
      box-shadow: 0 0 8px rgba(30, 215, 96, 0.6);
      animation: sp-pulse 2s ease-in-out infinite;
    }
    .sp-dot--paused {
      background: #f5a623;
    }
    .sp-dot--off {
      background: var(--muted, #555);
    }

    /* Body */
    .sp-body {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px 16px;
      position: relative;
    }

    /* Album art + glow */
    .sp-art-wrap {
      position: relative;
      flex-shrink: 0;
    }
    .sp-art {
      width: 56px;
      height: 56px;
      border-radius: 10px;
      background-size: cover;
      background-position: center;
      background-color: rgba(30, 215, 96, 0.08);
      position: relative;
      z-index: 1;
      transition: transform 0.3s;
    }
    .sp-body--has-track .sp-art { transform: scale(1); }
    .sp-body--has-track:hover .sp-art { transform: scale(1.04); }
    .sp-art-glow {
      position: absolute;
      inset: -4px;
      border-radius: 14px;
      background-size: cover;
      background-position: center;
      filter: blur(20px) saturate(1.8);
      opacity: 0.3;
      z-index: 0;
      transition: opacity 0.4s;
    }
    .sp-dot--live ~ .sp-body .sp-art-glow { opacity: 0.35; }
    .sp-dot--paused ~ .sp-body .sp-art-glow { opacity: 0.15; }
    .sp-dot--off ~ .sp-body .sp-art-glow { opacity: 0; }

    /* Details */
    .sp-details {
      flex: 1;
      min-width: 0;
    }
    .sp-track-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sp-track {
      font-family: var(--font-head, sans-serif);
      font-size: 0.88rem;
      font-weight: 700;
      color: var(--text, #fff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
      min-width: 0;
    }

    /* Equalizer bars */
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
      background: #1DB954;
      border-radius: 1px;
      height: 3px;
      transition: height 0.2s;
    }
    .sp-eq--active span:nth-child(1) { animation: sp-eq1 0.8s ease-in-out infinite; }
    .sp-eq--active span:nth-child(2) { animation: sp-eq2 0.7s ease-in-out infinite 0.15s; }
    .sp-eq--active span:nth-child(3) { animation: sp-eq3 0.9s ease-in-out infinite 0.3s; }

    .sp-artist {
      font-size: 0.74rem;
      color: var(--muted, #888);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
      margin-bottom: 8px;
    }

    /* Progress */
    .sp-progress-wrap { display: flex; flex-direction: column; gap: 3px; }
    .sp-bar {
      height: 3px;
      background: rgba(255,255,255,0.06);
      border-radius: 2px;
      overflow: hidden;
    }
    .sp-bar-fill {
      height: 100%;
      background: #1DB954;
      border-radius: 2px;
      transition: width 1s linear;
    }
    .sp-times {
      display: flex;
      justify-content: space-between;
      font-size: 0.62rem;
      color: var(--muted, #888);
      font-variant-numeric: tabular-nums;
    }

    /* Open in Spotify */
    .sp-open {
      position: absolute;
      top: 14px;
      right: 18px;
      color: #1DB954;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .sp-activity-inner:hover .sp-open { opacity: 0.7; }
    .sp-open:hover { opacity: 1 !important; }

    /* Animations */
    @keyframes sp-pulse {
      0%, 100% { box-shadow: 0 0 8px rgba(30,215,96,0.6); }
      50%      { box-shadow: 0 0 14px rgba(30,215,96,0.9); }
    }
    @keyframes sp-eq1 {
      0%, 100% { height: 3px; }
      50%      { height: 12px; }
    }
    @keyframes sp-eq2 {
      0%, 100% { height: 5px; }
      50%      { height: 10px; }
    }
    @keyframes sp-eq3 {
      0%, 100% { height: 2px; }
      50%      { height: 14px; }
    }
    @keyframes sp-fade-in {
      from { opacity: 0; transform: translateY(4px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 480px) {
      .sp-activity { padding: 0 14px; }
      .sp-body { padding: 12px 14px 14px; gap: 12px; }
      .sp-art { width: 48px; height: 48px; }
    }
  `
  document.head.appendChild(el)
}
