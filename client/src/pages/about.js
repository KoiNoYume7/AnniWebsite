export async function renderAbout(root) {
  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="section-eyebrow reveal">The human</p>
        <h1 class="section-title reveal">About KoiNoYume7</h1>
        <p class="section-sub reveal about-intro" style="margin-bottom:64px">
          Koi for short. The person turning Monster Energy into working infrastructure.
        </p>

        <div class="about-layout" style="display:grid;grid-template-columns:2fr 1fr;gap:60px;align-items:start">
          <!-- Bio -->
          <div class="about-main">
            <div class="card reveal about-lead-card" style="margin-bottom:24px;border-left:3px solid var(--accent)">
              <p class="about-lead-text" style="font-size:1.08rem;line-height:1.82;color:var(--text-soft)">
                I'm a cybersecurity trainee based in Switzerland, learning how systems break so I can
                build ones that don't. By day I'm diving into networks, vulnerabilities, and how
                attackers think. By night I'm running my own infrastructure, self-hosting everything
                I can, and pushing commits at timestamps that only make sense if you drink enough
                Monster Energy.
              </p>
            </div>
            <div class="card reveal" style="margin-bottom:24px">
              <p class="about-body-text" style="font-size:1rem;line-height:1.82;color:var(--text-soft)">
                I call myself a <strong style="color:var(--accent)">vibe coder</strong> — I architect
                systems, debug the weird stuff, and direct where things go. I lean on AI to handle
                boilerplate so I can focus on the interesting problems. It's not cheating, it's
                working smart. The ideas, decisions, and 2AM debugging sessions are very much mine.
              </p>
            </div>
            <div class="card reveal">
              <p class="about-body-text" style="font-size:1rem;line-height:1.82;color:var(--text-soft)">
                When I'm not staring at terminal output, I'm deep in
                <strong style="color:var(--accent2)">Star Citizen</strong>, vibing in
                <strong style="color:var(--accent3)">Cyberpunk 2077</strong>, or doing
                long hauls in Euro Truck Simulator 2 with good bass music in my ears.
                Cars, anime, and gaming round out the rest. Yes, I contain multitudes.
              </p>
            </div>

            <!-- Fun facts -->
            <h2 style="font-family:var(--font-head);font-size:1.3rem;font-weight:800;margin:40px 0 20px;letter-spacing:-0.02em" class="reveal">
              A few things to know
            </h2>
            <div class="about-facts-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
              ${[
                { icon: '🇨🇭', label: 'Based in Switzerland' },
                { icon: '🔐', label: 'Cybersecurity trainee' },
                { icon: '🍀', label: 'Monster & Red Bull daily' },
                { icon: '🌙', label: 'Best commits after midnight' },
                { icon: '🚀', label: 'Star Citizen main' },
                { icon: '🎌', label: 'Anime & car enthusiast' },
                { icon: '🎵', label: 'Good bass is non-negotiable' },
                { icon: '🖥️', label: 'Self-hosts everything' },
              ].map(f => `
                <div class="card reveal about-fact-card" style="display:flex;align-items:center;gap:12px;padding:16px 20px">
                  <span class="about-fact-icon" style="font-size:1.3rem">${f.icon}</span>
                  <span class="about-fact-label" style="font-size:0.88rem;font-weight:500;color:var(--text-soft)">${f.label}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Sidebar: skills -->
          <div class="about-sidebar">
            <div class="card reveal" style="margin-bottom:20px">
              <h3 style="font-family:var(--font-head);font-weight:700;margin-bottom:22px;font-size:1rem">
                Languages & Tech
              </h3>
              ${[
                { name: 'Python',      pct: 75 },
                { name: 'JavaScript',  pct: 70 },
                { name: 'HTML / CSS',  pct: 85 },
                { name: 'PowerShell',  pct: 60 },
                { name: 'C',           pct: 45 },
                { name: 'Bash / CLI',  pct: 80 },
              ].map(s => `
                <div class="skill-item">
                  <div class="skill-header">
                    <span>${s.name}</span>
                    <span class="skill-pct">${s.pct}%</span>
                  </div>
                  <div class="prog-track">
                    <div class="prog-fill prog-blue" style="width:0%" data-pct="${s.pct}"></div>
                  </div>
                </div>
              `).join('')}
            </div>

            <div class="card reveal" style="margin-bottom:20px">
              <h3 style="font-family:var(--font-head);font-weight:700;margin-bottom:16px;font-size:1rem">
                Infrastructure
              </h3>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${['Raspberry Pi 4','Linux','Nginx','Tailscale','Cloudflared','Samba','Fail2ban','UFW','Docker (learning)'].map(t =>
                  `<span class="tag">${t}</span>`
                ).join('')}
              </div>
            </div>

            <div class="card reveal">
              <h3 style="font-family:var(--font-head);font-weight:700;margin-bottom:16px;font-size:1rem">
                Currently learning
              </h3>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${['Penetration Testing','Network Security','CTF Challenges','Reverse Engineering'].map(t =>
                  `<span class="tag tag-purple">${t}</span>`
                ).join('')}
              </div>
            </div>

            <div class="reveal" style="margin-top:20px;text-align:center">
              <a href="https://github.com/KoiNoYume7" target="_blank" rel="noopener" class="btn btn-ghost" style="width:100%;justify-content:center">
                GitHub Profile ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `

  // Animate skill bars after mount
  setTimeout(() => {
    document.querySelectorAll('.prog-fill[data-pct]').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%'
    })
  }, 300)
}
