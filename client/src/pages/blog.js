import devlogsData from '../data/devlogs.json'

export async function renderBlog(root, slug = '') {
  if (slug) {
    renderPost(root, slug)
    return
  }

  root.innerHTML = `
    <section class="section">
      <div class="wrap">
        <p class="section-eyebrow reveal">Writing</p>
        <h1 class="section-title reveal">Devlog</h1>
        <p class="section-sub reveal" style="margin-bottom:52px">
          Build notes, setup guides, and the occasional midnight thought.
        </p>

        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:20px" id="blog-grid">
          ${devlogsData.map((post, i) => `
            <a class="blog-card reveal" style="animation-delay:${i * 0.08}s"
               href="#/blog/${post.slug}" onclick="navigate('blog/${post.slug}');return false">
              <div class="blog-date">${formatDate(post.date)}</div>
              <div class="blog-title">${post.title}</div>
              ${post.subtitle ? `<div style="font-size:0.82rem;color:var(--accent);margin-bottom:6px">${post.subtitle}</div>` : ''}
              <div class="blog-excerpt">${post.excerpt}</div>
              <div class="blog-tags">
                ${post.tags.map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
            </a>
          `).join('')}

          <div class="blog-card reveal" style="opacity:0.45;cursor:default;animation-delay:${devlogsData.length * 0.08}s">
            <div class="blog-date">coming soon</div>
            <div class="blog-title">More posts incoming…</div>
            <div class="blog-excerpt">Security research notes, CTF writeups, and more devlogs in the pipeline.</div>
          </div>
        </div>
      </div>
    </section>
  `
}

function renderPost(root, slug) {
  const post = devlogsData.find(p => p.slug === slug)
  if (!post) {
    root.innerHTML = `
      <div class="wrap" style="padding:100px 0;text-align:center;color:var(--muted)">
        <div style="font-size:2.5rem;margin-bottom:16px">🕵️</div>
        <h2 style="font-family:var(--font-head);font-weight:800;margin-bottom:12px">Post not found</h2>
        <button class="btn btn-ghost" onclick="navigate('blog')">← Back to Devlog</button>
      </div>`
    return
  }

  const rendered = simpleMarkdown(post.content)

  root.innerHTML = `
    <section style="padding:80px 0">
      <div class="wrap" style="max-width:780px">
        <button class="btn btn-ghost btn-sm" onclick="navigate('blog')" style="margin-bottom:36px">
          ← Back to Devlog
        </button>
        <div class="reveal">
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px">
            ${post.tags.map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <h1 style="font-family:var(--font-head);font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:800;letter-spacing:-0.03em;line-height:1.1;margin-bottom:10px">
            ${post.title}
          </h1>
          ${post.subtitle ? `<p style="color:var(--accent);font-size:0.95rem;margin-bottom:16px">${post.subtitle}</p>` : ''}
          <p style="font-family:var(--font-mono);font-size:0.78rem;color:var(--muted);margin-bottom:48px">
            ${formatDate(post.date)} · KoiNoYume7
          </p>
          <div class="blog-content card" style="line-height:1.85;font-size:0.97rem">
            ${rendered}
          </div>
        </div>
      </div>
    </section>
  `

  if (!document.getElementById('blog-content-styles')) {
    const style = document.createElement('style')
    style.id = 'blog-content-styles'
    style.textContent = `
      .blog-content h2 { font-family:var(--font-head);font-size:1.3rem;font-weight:700;margin:32px 0 14px;color:var(--text); }
      .blog-content p { color:var(--text-soft);margin-bottom:16px; }
      .blog-content ul, .blog-content ol { color:var(--text-soft);margin-bottom:16px;padding-left:24px; }
      .blog-content li { margin-bottom:6px; }
      .blog-content code { font-family:var(--font-mono);font-size:0.82rem;background:var(--bg2);padding:2px 7px;border-radius:5px;color:var(--accent); }
      .blog-content pre { background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:20px;overflow-x:auto;margin:20px 0; }
      .blog-content pre code { background:none;padding:0;color:var(--accent2);font-size:0.8rem; }
      .blog-content a { color:var(--accent);text-decoration:underline;text-underline-offset:3px; }
      .blog-content strong { color:var(--text);font-weight:600; }
    `
    document.head.appendChild(style)
  }
}

function simpleMarkdown(md) {
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>').replace(/$/, '</p>')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
