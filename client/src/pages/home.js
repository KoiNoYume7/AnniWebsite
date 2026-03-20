// ── Home page ──
// Organizer-first: leads with the product, personal bio second.

// ── GitHub prefetch (called at boot so data is ready when user navigates here) ──
export async function prefetchGitHub() {
  try {
    if (sessionStorage.getItem('github_repos')) return
    const res = await fetch('https://api.github.com/users/KoiNoYume7/repos?per_page=20&sort=updated')
    if (!res.ok) return
    sessionStorage.setItem('github_repos', JSON.stringify(await res.json()))
  } catch (_) { /* silent — page handles its own fallback */ }
}

export async function renderHome(root) {
  root.innerHTML = `
    <!-- ── Hero: Organizer as the product ── -->
    <section class="home-hero" style="padding:130px 0 80px;position:relative;overflow:hidden">
      <div class="wrap">
        <div class="home-hero-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center">

          <div class="home-hero-copy">
            <p class="section-eyebrow reveal" style="animation-delay:0s">yumehana.dev</p>
            <h1 class="reveal" style="font-family:var(--font-head);font-size:clamp(2.4rem,5vw,3.6rem);font-weight:800;letter-spacing:-0.035em;line-height:1.05;margin-bottom:22px;animation-delay:0.08s">
              One place for todos,<br>time, finance<br>& <span style="color:var(--accent)">Claude.</span>
            </h1>
            <p class="reveal home-hero-desc" style="color:var(--muted);font-size:1.02rem;line-height:1.75;max-width:430px;margin-bottom:36px;animation-delay:0.16s">
              A self-hosted personal life OS — built in public, running on a Raspberry Pi 4.
              Open to anyone. No SaaS fees, no black boxes.
            </p>
            <div class="reveal home-hero-actions" style="display:flex;gap:14px;flex-wrap:wrap;animation-delay:0.24s">
              <button class="btn btn-primary" onclick="navigate('organizer')">Open Organizer →</button>
              <button class="btn btn-ghost"   onclick="navigate('projects')">See projects</button>
            </div>
            <div class="reveal home-hero-links" style="margin-top:32px;display:flex;gap:24px;animation-delay:0.32s">
              <a href="https://github.com/KoiNoYume7" target="_blank" rel="noopener"
                style="color:var(--muted);font-size:0.82rem;font-weight:500;text-decoration:none;transition:color .2s"
                onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--muted)'">
                GitHub ↗
              </a>
              <span class="home-hero-sep" style="color:var(--border)">|</span>
              <a href="https://discord.gg/anni" target="_blank" rel="noopener"
                style="color:var(--muted);font-size:0.82rem;font-weight:500;text-decoration:none;transition:color .2s"
                onmouseover="this.style.color='var(--accent2)'" onmouseout="this.style.color='var(--muted)'">
                Discord Server ↗
              </a>
            </div>
          </div>

          <!-- Feature grid -->
          <div class="reveal" style="animation-delay:0.2s">
            <div class="home-feature-grid">
              ${[
                { icon: '🗒️', label: 'Todos',     desc: 'Priority lists with drag-to-reorder and Claude-powered daily planning.' },
                { icon: '📅', label: 'Calendar',  desc: 'FullCalendar with drag-to-reschedule and AI week summaries.' },
                { icon: '⏰', label: 'Reminders', desc: 'Node-cron delivery, flexible repeat rules, and web push in Phase 5.' },
                { icon: '💰', label: 'Finance',   desc: 'Income & expense ledger with Chart.js breakdowns and Claude insights.' },
                { icon: '✨', label: 'AI Chat',   desc: 'Claude Sonnet streams in-panel with context from all your data.' },
              ].map(f => `
                <div class="home-feature-card reveal">
                  <div class="home-feature-icon">${f.icon}</div>
                  <div class="home-feature-label">${f.label}</div>
                  <div class="home-feature-desc">${f.desc}</div>
                </div>`).join('')}
            </div>
          </div>

        </div>
      </div>
    </section>

    <hr class="divider" />

    <!-- ── Status teaser ── -->
    <section class="section-sm">
      <div class="wrap">
        <div class="reveal home-status-card" style="background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px 36px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px">
          <div class="home-status-meta" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
            <div class="uptime-badge">
              <div style="width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse 2s infinite"></div>
              All systems operational
            </div>
            <span style="color:var(--muted);font-size:0.85rem">rpi4 · nginx · tailscale · cloudflared — running</span>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="navigate('status')">Pi dashboard →</button>
        </div>
      </div>
    </section>

    <hr class="divider" />

    <!-- ── Builder section: who made this ── -->
    <section class="section">
      <div class="wrap">
        <div class="home-about-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center">

          <div class="reveal">
            <p class="section-eyebrow">The builder</p>
            <h2 class="section-title">Building tools<br class="home-about-br">at <span style="color:var(--accent)">2AM</span>,<br class="home-about-br">fuelled by <span style="color:var(--accent2)">Monster.</span></h2>
            <p style="color:var(--muted);font-size:0.97rem;line-height:1.78;margin-bottom:28px">
              Cybersecurity trainee from Switzerland. Evenings: self-hosting infrastructure,
              building privacy tools, and pushing commits at timestamps that would concern a doctor.
              Runs on a Raspberry Pi 4 and a dangerous amount of energy drinks.
            </p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px">
              ${['Python','JavaScript','C','PowerShell','Linux','Networking','Cybersecurity','RPi4'].map(s =>
                `<span class="tag">${s}</span>`
              ).join('')}
            </div>
            <button class="btn btn-ghost" onclick="navigate('about')">Read more →</button>
          </div>

          <!-- Pi terminal -->
          <div class="reveal home-hero-terminal-wrap" style="animation-delay:0.2s">
            <div id="hero-terminal" class="home-hero-terminal" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px;font-family:var(--font-mono);font-size:0.82rem;box-shadow:var(--shadow)">
              <div style="display:flex;gap:8px;margin-bottom:20px">
                <div style="width:11px;height:11px;border-radius:50%;background:#ff5f57"></div>
                <div style="width:11px;height:11px;border-radius:50%;background:#febc2e"></div>
                <div style="width:11px;height:11px;border-radius:50%;background:#28c840"></div>
                <span style="margin-left:8px;color:var(--muted);font-size:0.75rem">koi@rpi4 ~ $</span>
              </div>
              <div id="terminal-lines" style="line-height:2"></div>
            </div>
          </div>

        </div>
      </div>
    </section>

    <hr class="divider" />

    <!-- ── Featured projects ── -->
    <section class="section">
      <div class="wrap">
        <p class="section-eyebrow reveal">Work</p>
        <h2 class="section-title reveal">Featured Projects</h2>
        <p class="section-sub reveal" style="margin-bottom:52px">Open-source tools I'm actively building. All self-hosted, all real.</p>
        <div class="home-projects-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:22px" id="home-projects-grid">
          <div style="height:220px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius-lg);display:flex;align-items:center;justify-content:center;color:var(--muted)">
            Loading projects…
          </div>
        </div>
        <div class="reveal" style="margin-top:36px;text-align:center">
          <button class="btn btn-ghost" onclick="navigate('projects')">All Projects →</button>
        </div>
      </div>
    </section>

    <hr class="divider" />

    <!-- ── Discord CTA ── -->
    <section class="section-sm">
      <div class="wrap">
        <div class="reveal home-discord-cta" style="background:linear-gradient(135deg,rgba(88,101,242,0.12),rgba(99,210,190,0.08));border:1px solid rgba(88,101,242,0.25);border-radius:var(--radius-lg);padding:52px;text-align:center">
          <div style="font-size:2.2rem;margin-bottom:16px">💬</div>
          <h2 style="font-family:var(--font-head);font-size:1.8rem;font-weight:800;letter-spacing:-0.025em;margin-bottom:12px">
            Join the Anni Projects Discord
          </h2>
          <p style="color:var(--muted);max-width:480px;margin:0 auto 28px;line-height:1.7">
            A community for AnniProxy, AnniWebsite, and everything else being built here.
            Updates, discussions, and the occasional 3AM progress post.
          </p>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
            <a href="https://discord.gg/anni" target="_blank" rel="noopener" class="btn btn-primary">Join Discord →</a>
            <button class="btn btn-ghost" onclick="navigate('contact')">Send a message</button>
          </div>
        </div>
      </div>
    </section>
  `

  // ── Terminal animation ──
  const lines = [
    { text: '$ uptime',                                          color: 'var(--accent)',  delay: 200 },
    { text: ' 12 days, 7:34 — load: 0.42',                      color: 'var(--text)',    delay: 700 },
    { text: '$ systemctl status nginx',                          color: 'var(--accent)',  delay: 1300 },
    { text: ' ● nginx.service — Active: running',               color: 'var(--green)',   delay: 1800 },
    { text: '$ cat /proc/cpuinfo | grep Raspberry',             color: 'var(--accent)',  delay: 2500 },
    { text: ' Hardware : BCM2711 — Raspberry Pi 4',             color: 'var(--accent2)', delay: 3100 },
    { text: '$ whoami',                                          color: 'var(--accent)',  delay: 3800 },
    { text: ' koinoyume7 — vibe coder, self-hoster',            color: 'var(--accent3)', delay: 4300 },
    { text: '█',                                                 color: 'var(--accent)',  delay: 5000, blink: true },
  ]
  const container = document.getElementById('terminal-lines')
  if (container) {
    lines.forEach(({ text, color, delay, blink }) => {
      setTimeout(() => {
        const el = document.createElement('div')
        el.style.color = color
        el.textContent = text
        if (blink) el.style.animation = 'blink 1s step-end infinite'
        container.appendChild(el)
      }, delay)
    })
  }

  requestAnimationFrame(() => loadHomeProjects())
}

// ── GitHub project cards ──
async function loadHomeProjects() {
  let grid = document.getElementById('home-projects-grid')
  if (!grid) return

  const KNOWN = ['AnniProxy', 'AnniWebsite']
  const icons = { AnniProxy: '🔀', AnniWebsite: '🌐' }
  const descs = {
    AnniProxy:   'A self-hosted proxy browser backend — routes and manages web traffic privately, giving you full control.',
    AnniWebsite: 'This website + organizer. Built with Vite, plain JS, and a lot of Monster Energy. Self-hosted on RPi4.',
  }

  // Skeleton loaders
  grid.innerHTML = KNOWN.map(() => `
    <div class="project-card" style="opacity:0.35;pointer-events:none">
      <div style="width:44px;height:44px;border-radius:12px;background:var(--border);margin-bottom:14px"></div>
      <div style="height:16px;width:55%;background:var(--border);border-radius:4px;margin-bottom:10px"></div>
      <div style="height:11px;width:90%;background:var(--border);border-radius:4px;margin-bottom:6px"></div>
      <div style="height:11px;width:70%;background:var(--border);border-radius:4px"></div>
    </div>`).join('')

  let data = []
  try {
    const cached = sessionStorage.getItem('github_repos')
    if (cached) {
      data = JSON.parse(cached)
    } else {
      const res = await fetch('https://api.github.com/users/KoiNoYume7/repos?per_page=20&sort=updated')
      if (res.ok) {
        data = await res.json()
        sessionStorage.setItem('github_repos', JSON.stringify(data))
      }
    }
  } catch (_) { data = [] }

  if (!grid.isConnected) {
    grid = document.getElementById('home-projects-grid')
    if (!grid) return
  }

  const filtered = KNOWN.map(name => data.find(r => r.name === name)).filter(Boolean)
  const cards = filtered.length ? filtered : KNOWN.map(name => ({
    name, html_url: `https://github.com/KoiNoYume7/${name}`,
    stargazers_count: '—', forks_count: '—', topics: [], language: null,
  }))

  grid.innerHTML = cards.map(repo => `
    <a class="project-card reveal" href="${repo.html_url}" target="_blank" rel="noopener">
      <div class="pc-top">
        <div class="pc-icon">${icons[repo.name] || '📦'}</div>
        <span class="badge-wip">WIP</span>
      </div>
      <div class="pc-title">${repo.name}</div>
      <div class="pc-desc">${descs[repo.name] || repo.description || 'No description.'}</div>
      <div class="pc-tags">
        ${(repo.topics || []).slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('')}
        ${repo.language ? `<span class="tag tag-blue">${repo.language}</span>` : ''}
      </div>
      <div class="pc-footer">
        <div class="pc-stats">
          <span class="pc-stat">⭐ ${repo.stargazers_count}</span>
          <span class="pc-stat">🍴 ${repo.forks_count}</span>
        </div>
        <span class="pc-link">GitHub ↗</span>
      </div>
    </a>`).join('')

  grid.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'))

  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%')
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%')
    })
  })
}
