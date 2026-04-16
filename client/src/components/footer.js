export function renderFooter(root) {
  const year = new Date().getFullYear()
  root.innerHTML = `
    <footer>
      <div class="wrap footer-inner">
        <div class="footer-left">
          <span class="footer-brand">KoiNoYume7</span>
          <span>Built late at night · Self-hosted · <a href="https://yumehana.dev" style="color:var(--accent)">yumehana.dev</a></span>
        </div>
        <div class="footer-links">
          <a href="https://github.com/KoiNoYume7" target="_blank" rel="noopener">GitHub</a>
          <a href="#" onclick="navigate('projects');return false">Projects</a>
          <a href="#" onclick="navigate('blog');return false">Devlog</a>
          <a href="#" onclick="navigate('contact');return false">Contact</a>
        </div>
        <div class="footer-right">
          <div style="font-size:0.75rem">© ${year} KoiNoYume7</div>
        </div>
      </div>
    </footer>`
}
