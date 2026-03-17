// Drop this into src/components/nav.js to replace the existing file.
// It checks /api/auth/me on load so the nav button reflects real session state.

export async function renderNav(root) {
  const theme = localStorage.getItem('theme') || 'dark'
  root.innerHTML = `
    <nav>
      <div class="wrap nav-inner">
        <span class="nav-logo" onclick="closeNavMenu(); navigate('')" title="click 7× for a surprise">
          KoiNoYume<span class="logo-dot">7</span>
        </span>
        <div class="nav-links" id="navLinks">
          <button class="nav-link" data-route=""         onclick="closeNavMenu(); navigate('')">Home</button>
          <button class="nav-link" data-route="projects" onclick="closeNavMenu(); navigate('projects')">Projects</button>
          <button class="nav-link" data-route="about"    onclick="closeNavMenu(); navigate('about')">About</button>
          <button class="nav-link" data-route="blog"     onclick="closeNavMenu(); navigate('blog')">Devlog</button>
          <button class="nav-link" data-route="contact"  onclick="closeNavMenu(); navigate('contact')">Contact</button>
        </div>
        <div class="nav-actions">
          <button class="theme-toggle" onclick="toggleTheme()">
            <span class="theme-toggle-label">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
          </button>
          <button class="btn btn-primary btn-sm" onclick="closeNavMenu(); navigate('login')" id="navLoginBtn">
            Login
          </button>
          <button class="nav-hamburger"
                  onclick="toggleNavMenu()">☰</button>
        </div>
      </div>
    </nav>`

  // Check real session in background — update button if logged in
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (res.ok) {
      const { user } = await res.json()
      const btn = document.getElementById('navLoginBtn')
      if (btn) {
        btn.textContent = user.name
        btn.onclick = () => {
          closeNavMenu()
          navigate('status')
        }
      }
    }
  } catch (_) { /* backend not up yet, that's fine */ }
}
