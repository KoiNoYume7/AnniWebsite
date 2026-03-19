// ── Easter eggs — Konami code + logo ×7 + secret /anni route ──

import { showToast } from '../lib/toast.js'

// ── Konami Code (↑↑↓↓←→←→BA) ──
export function initKonami() {
  const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
  let pos = 0

  document.addEventListener('keydown', e => {
    if (e.key === seq[pos]) {
      pos++
      if (pos === seq.length) {
        pos = 0
        const overlay = document.getElementById('konami-overlay')
        if (!overlay) return
        overlay.classList.remove('hidden')
        overlay.style.pointerEvents = 'auto'
        overlay.style.cursor = 'auto'
        showToast('🎮 cheat code activated')
      }
    } else { pos = 0 }
  })

  function closeKonami() {
    const overlay = document.getElementById('konami-overlay')
    if (!overlay) return
    overlay.classList.add('hidden')
    overlay.style.pointerEvents = 'none'
  }

  document.getElementById('konami-close')?.addEventListener('click', closeKonami)
  document.getElementById('konami-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeKonami()
  })
}

// ── Logo click ×7 ──
export function initLogoSecret() {
  let clicks = 0, timer
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav-logo')) { clicks = 0; return }
    clicks++
    clearTimeout(timer)
    timer = setTimeout(() => { clicks = 0 }, 1800)
    if (clicks === 3) showToast('🌸 keep going...')
    if (clicks === 7) {
      clicks = 0
      location.hash = '#/anni'
      showToast('✦ you found it ✦')
    }
  })
}

// ── Secret /anni route — call this with the routes map from router.js ──
export function registerAnniRoute(routes) {
  routes['anni'] = async (root) => {
    root.innerHTML = `
      <div style="min-height:80vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:40px">
        <div>
          <div style="font-size:4rem;margin-bottom:16px">🌸</div>
          <h1 style="font-family:var(--font-head);font-size:2.5rem;font-weight:800;color:var(--accent);margin-bottom:12px">
            You found the secret page.
          </h1>
          <p style="color:var(--muted);max-width:420px;margin:0 auto 24px">
            Somewhere between a Monster Energy can and 2AM, this whole thing was built.<br>
            Thanks for exploring, curious one.
          </p>
          <div style="font-family:var(--font-mono);font-size:0.78rem;color:var(--muted);margin-bottom:32px">
            ↑↑↓↓←→←→BA · click logo ×7 · you're thorough, I respect it
          </div>
          <button class="btn btn-primary" id="back-to-reality-btn">← back to reality</button>
        </div>
      </div>`
    document.getElementById('back-to-reality-btn')?.addEventListener('click', () => {
      window.navigate('')
    })
  }
}
