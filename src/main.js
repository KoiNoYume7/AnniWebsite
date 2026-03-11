import { renderNav } from './components/nav.js'
import { renderFooter } from './components/footer.js'
import { renderHome } from './pages/home.js'
import { renderProjects } from './pages/projects.js'
import { renderBlog } from './pages/blog.js'
import { renderContact } from './pages/contact.js'
import { renderLogin } from './pages/login.js'
import { renderStatus } from './pages/status.js'
import { renderAbout } from './pages/about.js'

// ── Toast utility ──
export function showToast(msg, duration = 2800) {
  let t = document.getElementById('toast')
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t) }
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), duration)
}

// ── Router ──
const routes = {
  '':         renderHome,
  'home':     renderHome,
  'projects': renderProjects,
  'blog':     renderBlog,
  'contact':  renderContact,
  'about':    renderAbout,
  'login':    renderLogin,
  'status':   renderStatus,
}

function getRoute() {
  return location.hash.replace('#/', '').replace('#', '').split('?')[0] || ''
}

async function navigate(to) {
  // Normalise: undefined = read from URL, string = use that
  const raw = to !== undefined ? String(to) : getRoute()
  const hash = raw.replace(/^#\/?/, '').split('?')[0].split('/')[0]

  // Sync URL hash without re-triggering hashchange
  const target = `#/${hash}`
  if (location.hash !== target) {
    history.replaceState(null, '', target)
  }

  const render = routes[hash] || renderHome
  const root = document.getElementById('page-root')
  if (!root) return
  root.innerHTML = ''
  root.classList.remove('page-enter')
  void root.offsetWidth
  root.classList.add('page-enter')
  await render(root)

  document.querySelectorAll('.nav-link[data-route]').forEach(el => {
    el.classList.toggle('active', el.dataset.route === hash)
  })
  window.scrollTo({ top: 0, behavior: 'instant' })
  setupReveal()
}

window.navigate = navigate

window.addEventListener('hashchange', () => {
  const hash = getRoute()
  navigate(hash)
})

// ── Reveal on scroll ──
function setupReveal() {
  const els = document.querySelectorAll('.reveal')
  if (!els.length) return
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) } })
  }, { threshold: 0.12 })
  els.forEach(el => obs.observe(el))
}

// ── Starfield (enhanced: parallax + shooting stars + mouse drift) ──
function initStarfield() {
  const canvas = document.getElementById('star-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  let W = 0, H = 0
  let stars = [], shootingStars = []
  let scrollY = 0, mouseX = 0, mouseY = 0
  let targetScrollDrift = 0, currentScrollDrift = 0

  function makeStars() {
    // Three depth layers: far (small/dim), mid, near (large/bright)
    stars = [
      ...Array.from({ length: 80 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 0.6 + 0.2, a: Math.random() * 0.4 + 0.1,
        twinkle: Math.random() * Math.PI * 2, speed: Math.random() * 0.003 + 0.001,
        layer: 0.2  // far — barely moves
      })),
      ...Array.from({ length: 50 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 0.8 + 0.4, a: Math.random() * 0.5 + 0.2,
        twinkle: Math.random() * Math.PI * 2, speed: Math.random() * 0.005 + 0.002,
        layer: 0.6  // mid
      })),
      ...Array.from({ length: 25 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.0 + 0.6, a: Math.random() * 0.6 + 0.3,
        twinkle: Math.random() * Math.PI * 2, speed: Math.random() * 0.007 + 0.003,
        layer: 1.0  // near — moves most
      })),
    ]
  }

  function resize() {
    W = canvas.width  = window.innerWidth
    H = canvas.height = window.innerHeight
    makeStars()
  }
  window.addEventListener('resize', resize)
  resize()

  // Scroll tracking
  window.addEventListener('scroll', () => {
    targetScrollDrift = window.scrollY * 0.04
  }, { passive: true })

  // Mouse drift (subtle)
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 18
    mouseY = (e.clientY / window.innerHeight - 0.5) * 10
  }, { passive: true })

  // Shooting star spawner
  function spawnShootingStar() {
    shootingStars.push({
      x: Math.random() * W * 1.2 - W * 0.1,
      y: Math.random() * H * 0.5,
      len: Math.random() * 120 + 60,
      speed: Math.random() * 8 + 6,
      angle: Math.PI / 5 + (Math.random() - 0.5) * 0.3,
      alpha: 1,
      trail: [],
    })
  }
  // Spawn one every 4-9 seconds
  function scheduleShootingStar() {
    spawnShootingStar()
    setTimeout(scheduleShootingStar, Math.random() * 5000 + 4000)
  }
  setTimeout(scheduleShootingStar, 2000)

  function draw() {
    ctx.clearRect(0, 0, W, H)

    // Smooth scroll drift
    currentScrollDrift += (targetScrollDrift - currentScrollDrift) * 0.05

    stars.forEach(s => {
      s.twinkle += s.speed
      const alpha = (Math.sin(s.twinkle) * 0.35 + 0.65) * s.a

      // Parallax offset: scroll + mouse, scaled by layer depth
      const ox = mouseX * s.layer
      const oy = mouseY * s.layer + currentScrollDrift * s.layer

      const px = (s.x * W + ox + W) % W
      const py = (s.y * H + oy + H) % H

      ctx.beginPath()
      ctx.arc(px, py, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(190,220,255,${alpha})`
      ctx.fill()
    })

    // Shooting stars
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      const ss = shootingStars[i]
      ss.x += Math.cos(ss.angle) * ss.speed
      ss.y += Math.sin(ss.angle) * ss.speed
      ss.alpha -= 0.012

      if (ss.alpha <= 0 || ss.x > W + 50 || ss.y > H + 50) {
        shootingStars.splice(i, 1)
        continue
      }

      const tailX = ss.x - Math.cos(ss.angle) * ss.len
      const tailY = ss.y - Math.sin(ss.angle) * ss.len
      const grad = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y)
      grad.addColorStop(0, `rgba(99,210,190,0)`)
      grad.addColorStop(0.6, `rgba(190,220,255,${ss.alpha * 0.5})`)
      grad.addColorStop(1, `rgba(255,255,255,${ss.alpha})`)
      ctx.beginPath()
      ctx.moveTo(tailX, tailY)
      ctx.lineTo(ss.x, ss.y)
      ctx.strokeStyle = grad
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Glow tip
      ctx.beginPath()
      ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${ss.alpha})`
      ctx.fill()
    }

    requestAnimationFrame(draw)
  }
  draw()
}

// ── Custom cursor ──
function initCursor() {
  const dot  = document.getElementById('cursor-dot')
  const ring = document.getElementById('cursor-ring')
  if (!dot || !ring) return
  let mx = -100, my = -100, rx = -100, ry = -100
  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY })
  function loop() {
    rx += (mx - rx) * 0.18
    ry += (my - ry) * 0.18
    dot.style.left  = mx + 'px'; dot.style.top  = my + 'px'
    ring.style.left = rx + 'px'; ring.style.top = ry + 'px'
    requestAnimationFrame(loop)
  }
  loop()
  document.addEventListener('mouseover', e => {
    if (e.target.closest('a,button,.btn,.project-card,.blog-card,.oauth-btn')) {
      document.body.classList.add('cursor-hover')
    }
  })
  document.addEventListener('mouseout', e => {
    if (e.target.closest('a,button,.btn,.project-card,.blog-card,.oauth-btn')) {
      document.body.classList.remove('cursor-hover')
    }
  })
}

// ── Theme ──
function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark'
  document.documentElement.setAttribute('data-theme', saved)
}

export function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme')
  const next = curr === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('theme', next)
  document.querySelectorAll('.theme-toggle-label').forEach(el => {
    el.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark'
  })
  showToast(next === 'light' ? '☀️ Light mode on' : '🌙 Dark mode on')
}
window.toggleTheme = toggleTheme

// ── Konami Code ──
function initKonami() {
  const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a']
  let pos = 0
  document.addEventListener('keydown', e => {
    if (e.key === seq[pos]) {
      pos++
      if (pos === seq.length) {
        pos = 0
        const overlay = document.getElementById('konami-overlay')
        overlay.classList.remove('hidden')
        // BUG FIX 3: restore pointer-events and cursor when overlay is visible
        overlay.style.pointerEvents = 'auto'
        overlay.style.cursor = 'auto'
        showToast('🎮 cheat code activated')
      }
    } else { pos = 0 }
  })
  document.getElementById('konami-close')?.addEventListener('click', closeKonami)
  document.getElementById('konami-overlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeKonami()
  })

  function closeKonami() {
    const overlay = document.getElementById('konami-overlay')
    overlay.classList.add('hidden')
    // BUG FIX 3: give pointer-events back to the page so cursor works again
    overlay.style.pointerEvents = 'none'
  }
}

// ── Logo secret (click 7×) ──
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

// ── Secret /anni route ──
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
  // BUG FIX 2: attach click after DOM is in place, use history push not hash
  document.getElementById('back-to-reality-btn')?.addEventListener('click', () => {
    navigate('')
  })
}

// ── GitHub data pre-fetch (called once at boot so home page always has data) ──
export async function prefetchGitHub() {
  try {
    if (sessionStorage.getItem('github_repos')) return
    const res = await fetch('https://api.github.com/users/KoiNoYume7/repos?per_page=20&sort=updated')
    if (!res.ok) return
    const data = await res.json()
    sessionStorage.setItem('github_repos', JSON.stringify(data))
  } catch (_) { /* silent — pages handle their own fallback */ }
}
initTheme()
initStarfield()
initCursor()
initKonami()
renderNav(document.getElementById('nav-root'))
renderFooter(document.getElementById('footer-root'))
initLogoSecret()
prefetchGitHub()  // BUG FIX 1: pre-warm cache before home page renders
navigate()
