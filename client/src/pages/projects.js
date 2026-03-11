const PROJECT_META = {
  AnniProxy: {
    icon: '🔀',
    desc: 'A self-hosted proxy browser backend. Routes and manages web traffic privately — built for people who take their own infrastructure seriously.',
    tags: ['self-hosted', 'privacy', 'proxy', 'backend'],
    featured: true,
  },
  AnniWebsite: {
    icon: '🌐',
    desc: 'This very website. Built with Vite + vanilla JS, self-hosted on Raspberry Pi 4. Designed from scratch, no templates.',
    tags: ['vite', 'frontend', 'self-hosted'],
    featured: true,
  },
}

export async function renderProjects(root) {
  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="section-eyebrow reveal">Open Source</p>
        <h1 class="section-title reveal">Projects</h1>
        <p class="section-sub reveal" style="margin-bottom:52px">
          Everything I'm building — self-hosted, open-source, and works on my Raspberry Pi.
        </p>

        <div id="projects-loading" style="display:flex;align-items:center;justify-content:center;padding:80px 0;color:var(--muted);gap:12px;font-family:var(--font-mono);font-size:0.85rem">
          <span style="animation:pulse 1.2s ease-in-out infinite">⏳</span> Fetching from GitHub…
        </div>

        <div id="projects-grid" style="display:none;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px"></div>

        <div id="projects-error" style="display:none;text-align:center;padding:60px;color:var(--muted)">
          <div style="font-size:2rem;margin-bottom:12px">🔌</div>
          <p>Couldn't reach GitHub API. Showing cached data.</p>
        </div>
      </div>
    </section>
  `

  await loadProjects()
}

async function loadProjects() {
  const loading = document.getElementById('projects-loading')
  const grid = document.getElementById('projects-grid')
  const errorEl = document.getElementById('projects-error')
  let repos = []

  try {
    const cached = sessionStorage.getItem('github_repos')
    if (cached) {
      repos = JSON.parse(cached)
    } else {
      const res = await fetch('https://api.github.com/users/KoiNoYume7/repos?per_page=30&sort=updated')
      if (!res.ok) throw new Error('GitHub API error')
      repos = await res.json()
      sessionStorage.setItem('github_repos', JSON.stringify(repos))
    }
  } catch (e) {
    // fallback to known repos
    repos = Object.keys(PROJECT_META).map(name => ({
      name, html_url: `https://github.com/KoiNoYume7/${name}`,
      description: PROJECT_META[name].desc,
      stargazers_count: 0, forks_count: 0, language: null,
      topics: PROJECT_META[name].tags,
      updated_at: new Date().toISOString(),
    }))
    if (errorEl) errorEl.style.display = 'block'
  }

  if (loading) loading.style.display = 'none'
  if (!grid) return
  grid.style.display = 'grid'

  // Sort: featured first
  repos.sort((a, b) => {
    const af = PROJECT_META[a.name]?.featured ? 1 : 0
    const bf = PROJECT_META[b.name]?.featured ? 1 : 0
    return bf - af
  })

  grid.innerHTML = repos.map((repo, i) => {
    const meta = PROJECT_META[repo.name] || {}
    const icon = meta.icon || '📦'
    const desc = meta.desc || repo.description || 'No description available.'
    const tags = (repo.topics?.length ? repo.topics : meta.tags || []).slice(0, 5)
    const updated = new Date(repo.updated_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })

    return `
      <a class="project-card reveal" href="${repo.html_url}" target="_blank" rel="noopener"
         style="animation-delay:${i * 0.06}s">
        <div class="pc-top">
          <div class="pc-icon">${icon}</div>
          <span class="badge-wip">WIP</span>
        </div>
        <div class="pc-title">${repo.name}</div>
        <div class="pc-desc">${desc}</div>
        <div class="pc-tags">
          ${tags.map(t => `<span class="tag">${t}</span>`).join('')}
          ${repo.language ? `<span class="tag tag-blue">${repo.language}</span>` : ''}
        </div>
        <div class="pc-footer">
          <div class="pc-stats">
            <span class="pc-stat">⭐ ${repo.stargazers_count}</span>
            <span class="pc-stat">🍴 ${repo.forks_count}</span>
            <span class="pc-stat" style="font-size:0.7rem">Updated ${updated}</span>
          </div>
          <span class="pc-link">View ↗</span>
        </div>
      </a>
    `
  }).join('')

  // spotlight effect
  grid.querySelectorAll('.project-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%')
      card.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%')
    })
  })
}
