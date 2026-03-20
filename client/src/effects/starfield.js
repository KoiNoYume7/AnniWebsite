// ── Animated starfield canvas ──
// Three depth layers with parallax scroll/mouse drift + shooting stars.

export function initStarfield() {
  const canvas = document.getElementById('star-canvas')
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  let W = 0, H = 0
  let stars = [], shootingStars = []
  let mouseX = 0, mouseY = 0
  let targetScrollDrift = 0, currentScrollDrift = 0

  function makeStars() {
    stars = [
      // Far layer — small, dim, barely moves
      ...Array.from({ length: 80 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 0.6 + 0.2, a: Math.random() * 0.4 + 0.1,
        twinkle: Math.random() * Math.PI * 2, speed: Math.random() * 0.003 + 0.001,
        layer: 0.2,
      })),
      // Mid layer
      ...Array.from({ length: 50 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 0.8 + 0.4, a: Math.random() * 0.5 + 0.2,
        twinkle: Math.random() * Math.PI * 2, speed: Math.random() * 0.005 + 0.002,
        layer: 0.6,
      })),
      // Near layer — large, bright, moves most
      ...Array.from({ length: 25 }, () => ({
        x: Math.random(), y: Math.random(),
        r: Math.random() * 1.0 + 0.6, a: Math.random() * 0.6 + 0.3,
        twinkle: Math.random() * Math.PI * 2, speed: Math.random() * 0.007 + 0.003,
        layer: 1.0,
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

  window.addEventListener('scroll', () => {
    targetScrollDrift = window.scrollY * 0.04
  }, { passive: true })

  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 18
    mouseY = (e.clientY / window.innerHeight - 0.5) * 10
  }, { passive: true })

  function spawnShootingStar() {
    shootingStars.push({
      x:     Math.random() * W * 1.2 - W * 0.1,
      y:     Math.random() * H * 0.5,
      len:   Math.random() * 120 + 60,
      speed: Math.random() * 8 + 6,
      angle: Math.PI / 5 + (Math.random() - 0.5) * 0.3,
      alpha: 1,
    })
  }
  function scheduleShootingStar() {
    spawnShootingStar()
    setTimeout(scheduleShootingStar, Math.random() * 5000 + 4000)
  }
  setTimeout(scheduleShootingStar, 2000)

  function draw() {
    ctx.clearRect(0, 0, W, H)
    currentScrollDrift += (targetScrollDrift - currentScrollDrift) * 0.05

    stars.forEach(s => {
      s.twinkle += s.speed
      const alpha = (Math.sin(s.twinkle) * 0.35 + 0.65) * s.a
      const ox = mouseX * s.layer
      const oy = mouseY * s.layer + currentScrollDrift * s.layer
      const px = (s.x * W + ox + W) % W
      const py = (s.y * H + oy + H) % H
      ctx.beginPath()
      ctx.arc(px, py, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(190,220,255,${alpha})`
      ctx.fill()
    })

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
      const grad  = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y)
      grad.addColorStop(0,   `rgba(99,210,190,0)`)
      grad.addColorStop(0.6, `rgba(190,220,255,${ss.alpha * 0.5})`)
      grad.addColorStop(1,   `rgba(255,255,255,${ss.alpha})`)
      ctx.beginPath()
      ctx.moveTo(tailX, tailY)
      ctx.lineTo(ss.x, ss.y)
      ctx.strokeStyle = grad
      ctx.lineWidth   = 1.5
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(255,255,255,${ss.alpha})`
      ctx.fill()
    }

    requestAnimationFrame(draw)
  }
  draw()
}
