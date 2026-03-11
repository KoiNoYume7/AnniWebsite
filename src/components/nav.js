export function renderNav(root) {
  const theme = localStorage.getItem('theme') || 'dark'
  root.innerHTML = `
    <nav>
      <div class="wrap nav-inner">
        <span class="nav-logo" onclick="navigate('')" title="click 7× for a surprise">
          KoiNoYume<span class="logo-dot">7</span>
        </span>
        <div class="nav-links" id="navLinks">
          <button class="nav-link" data-route="" onclick="navigate('')">Home</button>
          <button class="nav-link" data-route="projects" onclick="navigate('projects')">Projects</button>
          <button class="nav-link" data-route="about" onclick="navigate('about')">About</button>
          <button class="nav-link" data-route="blog" onclick="navigate('blog')">Devlog</button>
          <button class="nav-link" data-route="contact" onclick="navigate('contact')">Contact</button>
        </div>
        <div class="nav-actions">
          <button class="theme-toggle" onclick="toggleTheme()">
            <span class="theme-toggle-label">${theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
          </button>
          <button class="btn btn-primary btn-sm" onclick="navigate('login')" id="navLoginBtn">Login</button>
          <button class="nav-hamburger" onclick="document.getElementById('navLinks').classList.toggle('open')">☰</button>
        </div>
      </div>
    </nav>`

  // Check session auth
  const user = sessionStorage.getItem('anni_user')
  if (user) {
    const btn = document.getElementById('navLoginBtn')
    if (btn) {
      const u = JSON.parse(user)
      btn.textContent = u.name?.split(' ')[0] || 'Dashboard'
      btn.onclick = () => navigate('status')
    }
  }
}
