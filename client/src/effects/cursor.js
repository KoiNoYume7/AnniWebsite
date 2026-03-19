// ── Custom cursor — dot + trailing ring ──
// Hidden automatically on touch devices via CSS.

export function initCursor() {
  const dot  = document.getElementById('cursor-dot')
  const ring = document.getElementById('cursor-ring')
  if (!dot || !ring) return

  let mx = -100, my = -100, rx = -100, ry = -100

  window.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY })

  function loop() {
    rx += (mx - rx) * 0.18
    ry += (my - ry) * 0.18
    dot.style.left  = mx + 'px'
    dot.style.top   = my + 'px'
    ring.style.left = rx + 'px'
    ring.style.top  = ry + 'px'
    requestAnimationFrame(loop)
  }
  loop()

  const HOVER_SELECTOR = 'a, button, .btn, .project-card, .blog-card, .oauth-btn, .organizer-nav-btn, .organizer-tab-btn'

  document.addEventListener('mouseover', e => {
    if (e.target.closest(HOVER_SELECTOR)) document.body.classList.add('cursor-hover')
  })
  document.addEventListener('mouseout', e => {
    if (e.target.closest(HOVER_SELECTOR)) document.body.classList.remove('cursor-hover')
  })
}
