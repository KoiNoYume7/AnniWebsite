import projectsData from '../data/projects.json'

export async function renderProjects(root) {
  const featured = projectsData.filter(p => p.featured)
  const rest     = projectsData.filter(p => !p.featured)

  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="section-eyebrow reveal">Open Source</p>
        <h1 class="section-title reveal">Projects</h1>
        <p class="section-sub reveal" style="margin-bottom:52px">
          Everything I'm building — self-hosted, open-source, and real.
        </p>

        <div id="projects-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px">
          ${featured.map((p, i) => projectCard(p, i)).join('')}
        </div>

        ${rest.length ? `
          <div id="projects-more-wrap" style="display:none">
            <h2 class="reveal" style="font-family:var(--font-head);font-size:1.2rem;font-weight:700;margin:48px 0 20px;color:var(--muted)">
              All projects
            </h2>
            <div id="projects-more-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px">
              ${rest.map((p, i) => projectCard(p, i + featured.length)).join('')}
            </div>
          </div>
          <div class="reveal" style="margin-top:36px;text-align:center" id="projects-toggle-wrap">
            <button class="btn btn-ghost" id="projects-toggle-btn">Show all projects (${projectsData.length})</button>
          </div>
        ` : ''}
      </div>
    </section>
  `

  // Toggle show all
  const toggleBtn = document.getElementById('projects-toggle-btn')
  const moreWrap  = document.getElementById('projects-more-wrap')
  if (toggleBtn && moreWrap) {
    toggleBtn.addEventListener('click', () => {
      const showing = moreWrap.style.display !== 'none'
      moreWrap.style.display = showing ? 'none' : 'block'
      toggleBtn.textContent = showing
        ? `Show all projects (${projectsData.length})`
        : 'Show featured only'
      // Trigger reveal on newly visible cards
      if (!showing) {
        moreWrap.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'))
      }
    })
  }

  // Spotlight effect on cards
  root.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%')
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%')
    })
  })
}

function projectCard(p, i) {
  const statusBadge = p.status === 'wip'    ? '<span class="badge-wip">WIP</span>'
                    : p.status === 'stable'  ? '<span class="badge-up">Stable</span>'
                    : ''
  const updated = new Date(p.updated_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
  return `
    <a class="project-card reveal" href="${p.url}" target="_blank" rel="noopener"
       style="animation-delay:${i * 0.06}s">
      <div class="pc-top">
        <div class="pc-icon">${p.icon}</div>
        ${statusBadge}
      </div>
      <div class="pc-title">${p.name}</div>
      ${p.phase ? `<div style="font-size:0.72rem;color:var(--accent);font-weight:600;letter-spacing:0.05em">${p.phase}</div>` : ''}
      <div class="pc-desc">${p.description}</div>
      <div class="pc-tags">
        ${p.tags.slice(0, 5).map(t => `<span class="tag">${t}</span>`).join('')}
        ${p.language ? `<span class="tag tag-blue">${p.language}</span>` : ''}
      </div>
      <div class="pc-footer">
        <div class="pc-stats">
          <span class="pc-stat">⭐ ${p.stars}</span>
          <span class="pc-stat">🍴 ${p.forks}</span>
          <span class="pc-stat" style="font-size:0.7rem">Updated ${updated}</span>
        </div>
        <span class="pc-link">View ↗</span>
      </div>
    </a>`
}
