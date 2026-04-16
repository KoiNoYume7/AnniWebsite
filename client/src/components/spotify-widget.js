// ── Spotify "Now Playing" widget ──
// Polls /api/spotify/now-playing every 30s (only when visible via IntersectionObserver).
// Shows album art, track name, artist, progress bar, and a "Listen along" link.

let pollTimer = null
let progressTimer = null
let observer = null
let currentProgress = 0
let currentDuration = 0

export function mountSpotifyWidget(container) {
  container.innerHTML = `
    <div class="spotify-widget" id="spotify-widget" style="display:none">
      <div class="spotify-inner">
        <div class="spotify-album-art" id="spotify-art"></div>
        <div class="spotify-info">
          <div class="spotify-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
            </svg>
            <span>Now Playing</span>
          </div>
          <div class="spotify-track" id="spotify-track">—</div>
          <div class="spotify-artist" id="spotify-artist">—</div>
          <div class="spotify-progress-wrap">
            <div class="spotify-progress-bar">
              <div class="spotify-progress-fill" id="spotify-progress"></div>
            </div>
            <div class="spotify-times">
              <span id="spotify-time-current">0:00</span>
              <span id="spotify-time-total">0:00</span>
            </div>
          </div>
        </div>
        <a class="spotify-listen" id="spotify-link" href="#" target="_blank" rel="noopener" title="Open in Spotify">
          ↗
        </a>
      </div>
    </div>
  `

  injectStyles()

  const widget = document.getElementById('spotify-widget')

  // Only poll when visible
  observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) {
      fetchNowPlaying()
      pollTimer = setInterval(fetchNowPlaying, 30_000)
    } else {
      clearInterval(pollTimer)
      clearInterval(progressTimer)
    }
  }, { threshold: 0.1 })

  observer.observe(widget)
}

export function unmountSpotifyWidget() {
  clearInterval(pollTimer)
  clearInterval(progressTimer)
  if (observer) { observer.disconnect(); observer = null }
}

async function fetchNowPlaying() {
  try {
    const res = await fetch('/api/spotify/now-playing')
    const data = await res.json()

    const widget  = document.getElementById('spotify-widget')
    if (!widget) return

    if (!data.ok || !data.playing) {
      widget.style.display = 'none'
      clearInterval(progressTimer)
      return
    }

    const { track } = data
    widget.style.display = ''

    // Album art
    const artEl = document.getElementById('spotify-art')
    if (artEl) {
      artEl.style.backgroundImage = track.albumArt ? `url(${track.albumArt})` : 'none'
    }

    // Track info
    const trackEl  = document.getElementById('spotify-track')
    const artistEl = document.getElementById('spotify-artist')
    if (trackEl) trackEl.textContent = track.name
    if (artistEl) artistEl.textContent = track.artist

    // Link
    const linkEl = document.getElementById('spotify-link')
    if (linkEl) linkEl.href = track.url || '#'

    // Progress
    currentProgress = track.progress_ms || 0
    currentDuration = track.duration_ms || 1
    updateProgress()

    // Smooth progress interpolation between polls
    clearInterval(progressTimer)
    progressTimer = setInterval(() => {
      currentProgress += 1000
      if (currentProgress > currentDuration) currentProgress = currentDuration
      updateProgress()
    }, 1000)

  } catch (_) {
    // Silently fail — widget just stays hidden
  }
}

function updateProgress() {
  const fill = document.getElementById('spotify-progress')
  const cur  = document.getElementById('spotify-time-current')
  const tot  = document.getElementById('spotify-time-total')
  if (fill) fill.style.width = `${(currentProgress / currentDuration) * 100}%`
  if (cur) cur.textContent = formatMs(currentProgress)
  if (tot) tot.textContent = formatMs(currentDuration)
}

function formatMs(ms) {
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, '0')}`
}

function injectStyles() {
  if (document.getElementById('spotify-widget-style')) return
  const style = document.createElement('style')
  style.id = 'spotify-widget-style'
  style.textContent = `
    .spotify-widget {
      margin-top: 32px;
    }
    .spotify-inner {
      display: flex;
      align-items: center;
      gap: 16px;
      background: rgba(30, 215, 96, 0.06);
      border: 1px solid rgba(30, 215, 96, 0.15);
      border-radius: var(--radius-lg, 14px);
      padding: 14px 18px;
      max-width: 480px;
      margin: 0 auto;
      position: relative;
    }
    .spotify-album-art {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      background-size: cover;
      background-position: center;
      background-color: rgba(30, 215, 96, 0.1);
      flex-shrink: 0;
    }
    .spotify-info {
      flex: 1;
      min-width: 0;
    }
    .spotify-label {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.68rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1DB954;
      margin-bottom: 4px;
    }
    .spotify-track {
      font-family: var(--font-head, sans-serif);
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--text, #fff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .spotify-artist {
      font-size: 0.78rem;
      color: var(--muted, #999);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 6px;
    }
    .spotify-progress-wrap {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .spotify-progress-bar {
      height: 3px;
      background: rgba(30, 215, 96, 0.15);
      border-radius: 2px;
      overflow: hidden;
    }
    .spotify-progress-fill {
      height: 100%;
      background: #1DB954;
      border-radius: 2px;
      transition: width 1s linear;
    }
    .spotify-times {
      display: flex;
      justify-content: space-between;
      font-size: 0.64rem;
      color: var(--muted, #999);
      font-variant-numeric: tabular-nums;
    }
    .spotify-listen {
      position: absolute;
      top: 10px;
      right: 14px;
      color: #1DB954;
      font-size: 0.82rem;
      font-weight: 700;
      text-decoration: none;
      opacity: 0.6;
      transition: opacity 0.15s;
    }
    .spotify-listen:hover {
      opacity: 1;
    }
    @media (max-width: 480px) {
      .spotify-inner { padding: 12px 14px; gap: 12px; }
      .spotify-album-art { width: 44px; height: 44px; }
    }
  `
  document.head.appendChild(style)
}
