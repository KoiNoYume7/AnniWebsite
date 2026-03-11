export function renderFooter(root) {
  const year = new Date().getFullYear()
  root.innerHTML = `
    <footer>
      <div class="wrap footer-inner">
        <div class="footer-left">
          <span class="footer-brand">KoiNoYume7</span>
          <span>Built late at night · Self-hosted on Raspberry Pi 4 · <a href="https://yumehana.dev" style="color:var(--accent)">yumehana.dev</a></span>
        </div>
        <div class="footer-links">
          <a href="https://github.com/KoiNoYume7" target="_blank" rel="noopener">GitHub</a>
          <a href="#" onclick="navigate('projects');return false">Projects</a>
          <a href="#" onclick="navigate('contact');return false">Contact</a>
          <a href="#" onclick="navigate('login');return false">Dev Login</a>
        </div>
        <div class="footer-right">
          <div><span class="footer-status-dot"></span>rpi4 online</div>
          <div style="margin-top:4px;font-size:0.75rem">© ${year} KoiNoYume7</div>
        </div>
      </div>
    </footer>`
}
