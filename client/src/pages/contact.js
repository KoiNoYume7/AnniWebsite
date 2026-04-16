export async function renderContact(root) {
  root.innerHTML = `
    <section class="section">
      <div class="wrap contact-wrap" style="max-width:900px">
        <p class="section-eyebrow reveal">Get in touch</p>
        <h1 class="section-title reveal">Contact</h1>
        <p class="section-sub reveal contact-intro" style="margin-bottom:56px">
          Send me a message — it goes straight to my Discord.
        </p>

        <div class="contact-layout" style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start">
          <!-- Form -->
          <div class="card reveal contact-form-card">
            <h2 style="font-family:var(--font-head);font-size:1.2rem;font-weight:700;margin-bottom:24px">
              Send a message
            </h2>
            <div id="contact-form">
              <div class="form-group">
                <label class="form-label">Your name</label>
                <input class="form-input" id="cf-name" type="text" placeholder="Who are you?" />
              </div>
              <div class="form-group">
                <label class="form-label">Your email (optional)</label>
                <input class="form-input" id="cf-email" type="email" placeholder="If you want a reply" />
              </div>
              <div class="form-group">
                <label class="form-label">Subject</label>
                <input class="form-input" id="cf-subject" type="text" placeholder="What's this about?" />
              </div>
              <div class="form-group">
                <label class="form-label">Message</label>
                <textarea class="form-textarea" id="cf-message" placeholder="Say whatever you want…"></textarea>
              </div>
              <button class="btn btn-primary" style="width:100%;justify-content:center" id="cf-submit-btn">
                Send Message →
              </button>
              <p id="cf-status" style="margin-top:14px;font-size:0.82rem;text-align:center;display:none"></p>
            </div>
          </div>

          <!-- Other ways -->
          <div class="reveal contact-side">
            <div class="card contact-side-card" style="margin-bottom:18px">
              <h3 style="font-family:var(--font-head);font-weight:700;margin-bottom:16px;font-size:1rem">
                🐙 GitHub
              </h3>
              <p style="color:var(--muted);font-size:0.88rem;line-height:1.7;margin-bottom:16px">
                Check out my projects, or reach out there if the form isn't working.
              </p>
              <a href="https://github.com/KoiNoYume7" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="width:100%;justify-content:center">
                GitHub ↗
              </a>
            </div>

            <div class="card contact-note-card" style="background:var(--accent-dim);border-color:var(--border-h)">
              <p style="font-size:0.82rem;color:var(--muted);line-height:1.7">
                <strong style="color:var(--accent)">Heads up:</strong> Messages from this form are
                delivered via the backend to my Discord.
                I'll see it when I'm online — usually evenings (CET) and suspiciously late nights.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `

  const btn = document.getElementById('cf-submit-btn')
  btn?.addEventListener('click', submitContact)
}

async function submitContact() {
  const name    = document.getElementById('cf-name')?.value.trim()
  const email   = document.getElementById('cf-email')?.value.trim()
  const subject = document.getElementById('cf-subject')?.value.trim()
  const message = document.getElementById('cf-message')?.value.trim()
  const status  = document.getElementById('cf-status')
  const btn     = document.getElementById('cf-submit-btn')

  if (!name || !message) {
    setStatus('Name and message are required.', 'var(--yellow)')
    return
  }

  btn.disabled = true
  btn.textContent = 'Sending…'
  setStatus('', '')

  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, subject, message }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to send')
    setStatus('Message sent! I\'ll reply when I\'m back online.', 'var(--green)')
    document.getElementById('cf-name').value = ''
    document.getElementById('cf-email').value = ''
    document.getElementById('cf-subject').value = ''
    document.getElementById('cf-message').value = ''
  } catch (e) {
    setStatus('Failed to send. Try reaching out on GitHub instead.', 'var(--red)')
  }

  btn.disabled = false
  btn.textContent = 'Send Message →'

  function setStatus(msg, color) {
    if (!status) return
    status.style.display = msg ? 'block' : 'none'
    status.style.color = color
    status.textContent = msg
  }
}
