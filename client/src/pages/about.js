import aboutData from '../data/about.json'

export async function renderAbout(root) {
  const d = aboutData

  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="section-eyebrow reveal">The human</p>
        <h1 class="section-title reveal">About ${d.name}</h1>
        <p class="section-sub reveal about-intro" style="margin-bottom:64px">
          ${d.tagline}
        </p>

        <div class="about-layout" style="display:grid;grid-template-columns:2fr 1fr;gap:60px;align-items:start">
          <!-- Bio -->
          <div class="about-main">
            ${d.bio.map((paragraph, i) => `
              <div class="card reveal${i === 0 ? ' about-lead-card' : ''}" style="margin-bottom:24px${i === 0 ? ';border-left:3px solid var(--accent)' : ''}">
                <p class="${i === 0 ? 'about-lead-text' : 'about-body-text'}" style="font-size:${i === 0 ? '1.08rem' : '1rem'};line-height:1.82;color:var(--text-soft)">
                  ${paragraph}
                </p>
              </div>
            `).join('')}

            <h2 style="font-family:var(--font-head);font-size:1.3rem;font-weight:800;margin:40px 0 20px;letter-spacing:-0.02em" class="reveal">
              A few things to know
            </h2>
            <div class="about-facts-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
              ${d.facts.map(f => `
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
              ${d.skills.map(s => `
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
                ${d.infrastructure.map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
            </div>

            <div class="card reveal">
              <h3 style="font-family:var(--font-head);font-weight:700;margin-bottom:16px;font-size:1rem">
                Currently learning
              </h3>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                ${d.learning.map(t => `<span class="tag tag-purple">${t}</span>`).join('')}
              </div>
            </div>

            <div class="reveal" style="margin-top:20px;text-align:center">
              <a href="${d.github_url}" target="_blank" rel="noopener" class="btn btn-ghost" style="width:100%;justify-content:center">
                GitHub Profile ↗
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  `

  setTimeout(() => {
    document.querySelectorAll('.prog-fill[data-pct]').forEach(bar => {
      bar.style.width = bar.dataset.pct + '%'
    })
  }, 300)
}
