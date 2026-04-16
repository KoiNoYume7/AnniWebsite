// ── Home page ──
// Organizer-first: leads with the product, personal bio second.

import projectsData from '../data/projects.json'
import { mountSpotifyWidget, unmountSpotifyWidget } from '../components/spotify-widget.js'

export function prefetchGitHub() {
  // No longer needed — projects load from compiled JSON.
  // Kept as no-op so main.js doesn't break.
}

export async function renderHome(root) {
  const featured = projectsData.filter(p => p.featured)

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
              A self-hosted personal life OS — built in public, open to anyone.
              No SaaS fees, no black boxes.
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
            </div>
          </div>

          <!-- Feature grid -->
          <div class="reveal" style="animation-delay:0.2s">
            <div class="home-feature-grid">
              ${[
                { icon: '🗒️', label: 'Todos',     desc: 'Priority lists with drag-to-reorder and Claude-powered daily planning.' },
                { icon: '📅', label: 'Calendar',  desc: 'FullCalendar with drag-to-reschedule and AI week summaries.' },
                { icon: '⏰', label: 'Reminders', desc: 'Flexible repeat rules and notifications.' },
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
            </p>
            <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:28px">
              ${['Python','JavaScript','C','PowerShell','Linux','Networking','Cybersecurity'].map(s =>
                `<span class="tag">${s}</span>`
              ).join('')}
            </div>
            <button class="btn btn-ghost" onclick="navigate('about')">Read more →</button>
          </div>

          <!-- Terminal -->
          <div class="reveal home-hero-terminal-wrap" style="animation-delay:0.2s">
            <div id="hero-terminal" class="home-hero-terminal" style="background:var(--bg2);border:1px solid var(--border);border-radius:var(--radius-lg);padding:28px;font-family:var(--font-mono);font-size:0.82rem;box-shadow:var(--shadow)">
              <div style="display:flex;gap:8px;margin-bottom:20px">
                <div style="width:11px;height:11px;border-radius:50%;background:#ff5f57"></div>
                <div style="width:11px;height:11px;border-radius:50%;background:#febc2e"></div>
                <div style="width:11px;height:11px;border-radius:50%;background:#28c840"></div>
                <span style="margin-left:8px;color:var(--muted);font-size:0.75rem">koi ~ $</span>
              </div>
              <div id="terminal-lines" style="line-height:2"></div>
            </div>
          </div>

        </div>

        <!-- ── Live Activity — sits inside the builder context ── -->
        <div class="home-live-activity reveal" style="animation-delay:0.3s">
          <div class="home-live-label">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="color:var(--accent)"><circle cx="12" cy="12" r="4"/><path d="M12 2a10 10 0 0 0-7.07 2.93l1.41 1.41A8 8 0 0 1 12 4V2z" opacity=".4"/><path d="M19.07 4.93l-1.41 1.41A8 8 0 0 1 20 12h2a10 10 0 0 0-2.93-7.07z" opacity=".4"/><path d="M4 12a8 8 0 0 1 2.34-5.66L4.93 4.93A10 10 0 0 0 2 12h2z" opacity=".4"/><path d="M12 20a8 8 0 0 1-5.66-2.34l-1.41 1.41A10 10 0 0 0 12 22v-2z" opacity=".4"/><path d="M20 12a8 8 0 0 1-2.34 5.66l1.41 1.41A10 10 0 0 0 22 12h-2z" opacity=".4"/></svg>
            <span>Currently vibing to</span>
          </div>
          <div id="spotify-mount"></div>
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
          ${featured.map(p => `
            <a class="project-card reveal" href="${p.url}" target="_blank" rel="noopener">
              <div class="pc-top">
                <div class="pc-icon">${p.icon}</div>
                ${p.status === 'wip' ? '<span class="badge-wip">WIP</span>' : p.status === 'active' ? '<span class="badge-up">Active</span>' : p.status === 'stable' ? '<span class="badge-up">Stable</span>' : ''}
              </div>
              <div class="pc-title">${p.name}</div>
              ${p.phase ? `<div style="font-size:0.72rem;color:var(--accent);font-weight:600;letter-spacing:0.05em">${p.phase}</div>` : ''}
              <div class="pc-desc">${p.description}</div>
              <div class="pc-tags">
                ${p.tags.slice(0, 4).map(t => `<span class="tag">${t}</span>`).join('')}
                ${p.language ? `<span class="tag tag-blue">${p.language}</span>` : ''}
              </div>
              <div class="pc-footer">
                <div class="pc-stats">
                  <span class="pc-stat">⭐ ${p.stars}</span>
                  <span class="pc-stat">🍴 ${p.forks}</span>
                </div>
                <span class="pc-link">GitHub ↗</span>
              </div>
            </a>`).join('')}
        </div>
        <div class="reveal" style="margin-top:36px;text-align:center">
          <button class="btn btn-ghost" onclick="navigate('projects')">All Projects →</button>
        </div>
      </div>
    </section>

    <hr class="divider" />

    <!-- ── Discord CTA (disabled — server not ready yet) ── -->
    <section class="section-sm">
      <div class="wrap">
        <div class="reveal home-discord-cta" style="background:linear-gradient(135deg,rgba(88,101,242,0.12),rgba(99,210,190,0.08));border:1px solid rgba(88,101,242,0.25);border-radius:var(--radius-lg);padding:52px;text-align:center;opacity:0.55;pointer-events:none">
          <div style="font-size:2.2rem;margin-bottom:16px">💬</div>
          <h2 style="font-family:var(--font-head);font-size:1.8rem;font-weight:800;letter-spacing:-0.025em;margin-bottom:12px">
            Anni Projects Discord
          </h2>
          <p style="color:var(--muted);max-width:480px;margin:0 auto 28px;line-height:1.7">
            A community for AnniProxy, AnniWebsite, and everything else being built here.
            Coming soon — the server is still being set up.
          </p>
          <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
            <span class="btn btn-ghost" style="cursor:default">Coming Soon</span>
            <button class="btn btn-ghost" style="pointer-events:auto;opacity:1" onclick="navigate('contact')">Send a message</button>
          </div>
        </div>
      </div>
    </section>
  `

  // ── Spotify widget ──
  const spotifyMount = document.getElementById('spotify-mount')
  if (spotifyMount) {
    unmountSpotifyWidget()  // clean up any previous instance
    mountSpotifyWidget(spotifyMount)
  }

  // ── Terminal animation ──
  const lines = [
    { text: '$ whoami',                                          color: 'var(--accent)',  delay: 200 },
    { text: ' koinoyume7 — vibe coder, self-hoster',            color: 'var(--accent3)', delay: 700 },
    { text: '$ git log --oneline -1',                            color: 'var(--accent)',  delay: 1400 },
    { text: ' feat: content-driven pages + data compilers',     color: 'var(--text)',    delay: 1900 },
    { text: '$ uptime',                                          color: 'var(--accent)',  delay: 2600 },
    { text: ' 12 days, 7:34 — load: 0.42',                      color: 'var(--text)',    delay: 3100 },
    { text: '$ systemctl status nginx',                          color: 'var(--accent)',  delay: 3800 },
    { text: ' ● nginx.service — Active: running',               color: 'var(--green)',   delay: 4300 },
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

  // Spotlight effect on project cards
  root.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%')
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%')
    })
  })
}
