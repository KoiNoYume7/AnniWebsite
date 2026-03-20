// ── App metadata + dev banner ──
// Fetches /api/meta at boot to know if we're in dev mode.
// Side-effect module: initialises window.__APP_META_PROMISE on import.

export async function syncAppMeta() {
  try {
    const res = await fetch('/api/meta', { credentials: 'include' })
    if (!res.ok) throw new Error('meta fetch failed')
    const data = await res.json()
    window.__APP_META = data
    if (data.devMode) injectDevBanner(data)
    return data
  } catch (_) {
    window.__APP_META = window.__APP_META || { devMode: false }
    return window.__APP_META
  }
}

export function injectDevBanner(meta) {
  if (!meta?.devMode) return
  const applyBanner = () => {
    if (document.getElementById('dev-banner')) return
    const banner = document.createElement('div')
    banner.id = 'dev-banner'
    banner.textContent = 'DEV ENVIRONMENT — localhost build, not production'
    document.body.prepend(banner)
    document.body.classList.add('has-dev-banner')
  }
  if (document.body) applyBanner()
  else window.addEventListener('DOMContentLoaded', applyBanner, { once: true })
}

// Kick off immediately — other modules can await window.__APP_META_PROMISE
if (typeof window !== 'undefined') {
  if (!window.__APP_META_PROMISE) {
    window.__APP_META_PROMISE = syncAppMeta()
  } else {
    window.__APP_META_PROMISE.then(meta => injectDevBanner(meta)).catch(() => {})
  }
}
