// ── Hash-based SPA router ──

import { renderHome }      from '../pages/home.js'
import { renderProjects }  from '../pages/projects.js'
import { renderBlog }      from '../pages/blog.js'
import { renderContact }   from '../pages/contact.js'
import { renderAbout }     from '../pages/about.js'
import { renderLogin }     from '../pages/login.js'
import { renderStatus }    from '../pages/status.js'
import { renderOrganizer } from '../organizer/index.js'

export const routes = {
  '':          renderHome,
  'home':      renderHome,
  'projects':  renderProjects,
  'blog':      renderBlog,
  'contact':   renderContact,
  'about':     renderAbout,
  'login':     renderLogin,
  'status':    renderStatus,
  'organizer': renderOrganizer,
}

export function getRoute() {
  return location.hash.replace('#/', '').replace('#', '').split('?')[0] || ''
}

export function closeNavMenu() {
  document.getElementById('navLinks')?.classList.remove('open')
}

export function toggleNavMenu() {
  document.getElementById('navLinks')?.classList.toggle('open')
}

function setupReveal() {
  const els = document.querySelectorAll('.reveal')
  if (!els.length) return
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target) }
    })
  }, { threshold: 0.12 })
  els.forEach(el => obs.observe(el))
}

export async function navigate(to) {
  closeNavMenu()
  const raw     = to !== undefined ? String(to) : getRoute()
  const cleaned = raw.replace(/^#\/?/, '').split('?')[0]
  const parts   = cleaned.split('/')
  const hash    = parts[0] || ''
  const subpath = parts.slice(1).join('/')           // e.g. 'rpi4-setup-2026' for blog/slug

  const target = subpath ? `#/${hash}/${subpath}` : `#/${hash}`
  if (location.hash !== target) history.replaceState(null, '', target)

  const render = routes[hash] || renderHome
  const root   = document.getElementById('page-root')
  if (!root) return

  root.innerHTML = ''
  root.classList.remove('page-enter')
  void root.offsetWidth
  root.classList.add('page-enter')

  await render(root, subpath)                        // subpath passed as second arg

  document.querySelectorAll('.nav-link[data-route]').forEach(el => {
    el.classList.toggle('active', el.dataset.route === hash)
  })
  window.scrollTo({ top: 0, behavior: 'instant' })
  setupReveal()
}

// ── Global exposure (inline onclick handlers in page templates use these) ──
window.navigate      = navigate
window.closeNavMenu  = closeNavMenu
window.toggleNavMenu = toggleNavMenu

window.addEventListener('hashchange', () => navigate(getRoute()))
