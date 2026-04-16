import projectsData from '../data/projects.json'

export async function renderProjects(root) {
  // Featured first, then the rest — all visible
  const sorted = [
    ...projectsData.filter(p => p.featured),
    ...projectsData.filter(p => !p.featured),
  ]
  const showExpand = sorted.length > 10
  const visible    = showExpand ? sorted.slice(0, 10) : sorted
  const hidden     = showExpand ? sorted.slice(10) : []

  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="section-eyebrow reveal">Open Source</p>
        <h1 class="section-title reveal">Projects</h1>
        <p class="section-sub reveal" style="margin-bottom:52px">
          Everything I'm building — self-hosted, open-source, and real.
        </p>

        <div id="projects-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px">
          ${visible.map((p, i) => projectCard(p, i)).join('')}
        </div>

        ${hidden.length ? `
          <div id="projects-more-wrap" style="display:none">
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px;margin-top:24px">
              ${hidden.map((p, i) => projectCard(p, i + visible.length)).join('')}
            </div>
          </div>
          <div class="reveal" style="margin-top:36px;text-align:center" id="projects-toggle-wrap">
            <button class="btn btn-ghost" id="projects-toggle-btn">Show all (${sorted.length})</button>
          </div>
        ` : ''}
      </div>
    </section>
  `

  // Inject featured glow styles
  if (!document.getElementById('projects-featured-style')) {
    const style = document.createElement('style')
    style.id = 'projects-featured-style'
    style.textContent = `
      .project-card.featured-card {
        border-color: rgba(99, 210, 190, 0.25);
        box-shadow: 0 0 20px rgba(99, 210, 190, 0.08), 0 0 40px rgba(99, 210, 190, 0.04);
      }
      .project-card.featured-card:hover {
        border-color: rgba(99, 210, 190, 0.4);
        box-shadow: 0 0 28px rgba(99, 210, 190, 0.14), 0 0 56px rgba(99, 210, 190, 0.06);
      }
    `
    document.head.appendChild(style)
  }

  // Expand toggle (only if >10 projects)
  const toggleBtn = document.getElementById('projects-toggle-btn')
  const moreWrap  = document.getElementById('projects-more-wrap')
  if (toggleBtn && moreWrap) {
    toggleBtn.addEventListener('click', () => {
      const showing = moreWrap.style.display !== 'none'
      moreWrap.style.display = showing ? 'none' : 'block'
      toggleBtn.textContent = showing ? `Show all (${sorted.length})` : 'Show less'
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
  const statusBadge = p.status === 'wip'     ? '<span class="badge-wip">WIP</span>'
                    : p.status === 'active'   ? '<span class="badge-up">Active</span>'
                    : p.status === 'stable'   ? '<span class="badge-up">Stable</span>'
                    : p.status === 'paused'   ? '<span class="badge-wip" style="background:rgba(250,204,21,0.12);color:var(--yellow)">Paused</span>'
                    : ''
  const featuredClass = p.featured ? ' featured-card' : ''
  const updated = p.updated_at
    ? new Date(p.updated_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })
    : null
  return `
    <a class="project-card${featuredClass} reveal" href="${p.url}" target="_blank" rel="noopener"
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
          ${updated ? `<span class="pc-stat" style="font-size:0.7rem">Updated ${updated}</span>` : ''}
        </div>
        <span class="pc-link">View ↗</span>
      </div>
    </a>`
}
