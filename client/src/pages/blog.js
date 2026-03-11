// Posts are defined here — later you can fetch .md files from /posts/ directory
const POSTS = [
  {
    slug: 'rpi4-setup-2026',
    title: 'Setting up a secure RPi4 home server from scratch',
    date: '2026-03-10',
    tags: ['self-hosting', 'linux', 'security', 'rpi4'],
    excerpt: 'Flashed a fresh Raspberry Pi OS Lite image, locked down SSH to key-only auth, installed Tailscale, Samba for NTFS drives, Fail2ban, UFW — and built this whole website on top. Here\'s exactly how.',
    content: `
## The Goal

I wanted a secure, always-on home server that I could trust to host real services.
Raspberry Pi 4, fresh Raspberry Pi OS Lite 64-bit, and a clean slate.

## Step 1: Harden everything first

Before installing anything useful, I locked the system down:
- SSH key-only auth (configured in the Raspberry Pi Imager tool before even flashing)
- UFW firewall: deny all incoming, allow outgoing
- Fail2ban for SSH brute-force protection
- Unattended security upgrades

## Step 2: Tailscale

Tailscale was the game-changer. Once installed, I restricted SSH to only be reachable
through the Tailscale interface — meaning the server isn't exposed to the internet at all
for admin purposes.

\`\`\`bash
sudo ufw delete allow ssh
sudo ufw allow in on tailscale0 to any port 22
\`\`\`

## Step 3: Samba for NTFS drives

Two external NTFS drives mounted at \`/srv/storage\` and \`/srv/backup\`.
Samba configured to only accept connections over the Tailscale interface.

## Step 4: This website

Built with Vite, pure vanilla JS, no frameworks. Designed from scratch.
Served via Nginx, exposed via Cloudflare Tunnel — no inbound ports open.

The result: a server I actually trust.
    `
  },
  {
    slug: 'anniproxy-devlog-1',
    title: 'AnniProxy devlog #1 — why I\'m building this',
    date: '2026-03-05',
    tags: ['anniproxy', 'devlog', 'privacy', 'backend'],
    excerpt: 'Most proxy solutions are either too complex, too slow, or I don\'t control them. AnniProxy started as a personal itch — a lightweight, self-hosted proxy backend I can actually trust.',
    content: `
## The Problem

I wanted a proxy browser I actually owned. Most hosted solutions track you,
rate-limit you, or go down at inconvenient times. Self-hosting was the obvious answer.

## AnniProxy — early design

The core idea: a backend service that manages proxy routing,
handles browser sessions, and gives you a dashboard to control it all.

## Current status

Early WIP. The repo is public at [github.com/KoiNoYume7/AnniProxy](https://github.com/KoiNoYume7/AnniProxy).
Devlogs will be posted here as it progresses.

Stay tuned.
    `
  },
]

export async function renderBlog(root) {
  // Check if we're viewing a specific post
  const hash = location.hash
  const postSlug = hash.includes('blog/') ? hash.split('blog/')[1] : null

  if (postSlug) {
    renderPost(root, postSlug)
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
          ${POSTS.map((post, i) => `
            <a class="blog-card reveal" style="animation-delay:${i * 0.08}s"
               href="#blog/${post.slug}" onclick="navigateBlogPost('${post.slug}');return false">
              <div class="blog-date">${formatDate(post.date)}</div>
              <div class="blog-title">${post.title}</div>
              <div class="blog-excerpt">${post.excerpt}</div>
              <div class="blog-tags">
                ${post.tags.map(t => `<span class="tag">${t}</span>`).join('')}
              </div>
            </a>
          `).join('')}

          <!-- Coming soon placeholder -->
          <div class="blog-card reveal" style="opacity:0.45;cursor:default;animation-delay:${POSTS.length * 0.08}s">
            <div class="blog-date">coming soon</div>
            <div class="blog-title">More posts incoming…</div>
            <div class="blog-excerpt">Security research notes, CTF writeups, and more devlogs in the pipeline.</div>
          </div>
        </div>
      </div>
    </section>
  `

  window.navigateBlogPost = (slug) => {
    location.hash = `#blog/${slug}`
    renderPost(root, slug)
  }
}

function renderPost(root, slug) {
  const post = POSTS.find(p => p.slug === slug)
  if (!post) {
    root.innerHTML = `
      <div class="wrap" style="padding:100px 0;text-align:center;color:var(--muted)">
        <div style="font-size:2.5rem;margin-bottom:16px">🕵️</div>
        <h2 style="font-family:var(--font-head);font-weight:800;margin-bottom:12px">Post not found</h2>
        <button class="btn btn-ghost" onclick="navigate('blog')">← Back to Devlog</button>
      </div>`
    return
  }

  // Simple markdown-ish renderer (no dep needed for this level)
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
          <h1 style="font-family:var(--font-head);font-size:clamp(1.8rem,3.5vw,2.6rem);font-weight:800;letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px">
            ${post.title}
          </h1>
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

  // inject blog content styles
  const style = document.createElement('style')
  style.textContent = `
    .blog-content h2 { font-family:var(--font-head);font-size:1.3rem;font-weight:700;margin:32px 0 14px;color:var(--text); }
    .blog-content p { color:var(--text-soft);margin-bottom:16px; }
    .blog-content code { font-family:var(--font-mono);font-size:0.82rem;background:var(--bg2);padding:2px 7px;border-radius:5px;color:var(--accent); }
    .blog-content pre { background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:20px;overflow-x:auto;margin:20px 0; }
    .blog-content pre code { background:none;padding:0;color:var(--accent2);font-size:0.8rem; }
    .blog-content a { color:var(--accent);text-decoration:underline;text-underline-offset:3px; }
    .blog-content strong { color:var(--text);font-weight:600; }
  `
  document.head.appendChild(style)
}

function simpleMarkdown(md) {
  return md
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`)
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^/, '<p>').replace(/$/, '</p>')
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}
