// Replace with your actual Discord webhook URL
const DISCORD_WEBHOOK_URL = 'YOUR_DISCORD_WEBHOOK_URL_HERE'

export async function renderContact(root) {
  root.innerHTML = `
    <section class="section">
      <div class="wrap contact-wrap" style="max-width:900px">
        <p class="section-eyebrow reveal">Get in touch</p>
        <h1 class="section-title reveal">Contact</h1>
        <p class="section-sub reveal contact-intro" style="margin-bottom:56px">
          Send me a message — it'll land directly in my Discord DMs.
          Or just join the server and say hi.
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
              <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="submitContact()">
                Send via Discord →
              </button>
              <p id="cf-status" style="margin-top:14px;font-size:0.82rem;text-align:center;display:none"></p>
            </div>
          </div>

          <!-- Other ways -->
          <div class="reveal contact-side">
            <div class="card contact-side-card" style="margin-bottom:18px">
              <h3 style="font-family:var(--font-head);font-weight:700;margin-bottom:16px;font-size:1rem">
                💬 Discord Server
              </h3>
              <p style="color:var(--muted);font-size:0.88rem;line-height:1.7;margin-bottom:16px">
                The Anni Projects Discord — the best place to follow what I'm building,
                ask questions, or just hang out.
              </p>
              <a href="https://discord.gg/anni" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="width:100%;justify-content:center">
                Join Server ↗
              </a>
            </div>

            <div class="card contact-side-card" style="margin-bottom:18px">
              <h3 style="font-family:var(--font-head);font-weight:700;margin-bottom:16px;font-size:1rem">
                🐙 GitHub
              </h3>
              <p style="color:var(--muted);font-size:0.88rem;line-height:1.7;margin-bottom:16px">
                Open issues, PRs, or just star the repos if you like what you see.
              </p>
              <a href="https://github.com/KoiNoYume7" target="_blank" rel="noopener" class="btn btn-ghost btn-sm" style="width:100%;justify-content:center">
                GitHub ↗
              </a>
            </div>

            <div class="card contact-note-card" style="background:var(--accent-dim);border-color:var(--border-h)">
              <p style="font-size:0.82rem;color:var(--muted);line-height:1.7">
                <strong style="color:var(--accent)">Heads up:</strong> Messages from this form are
                sent via Discord webhook directly to my server.
                I'll see it when I'm online — usually evenings (CET) and suspiciously late nights.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  `

  window.submitContact = async () => {
    const name    = document.getElementById('cf-name')?.value.trim()
    const email   = document.getElementById('cf-email')?.value.trim()
    const subject = document.getElementById('cf-subject')?.value.trim()
    const message = document.getElementById('cf-message')?.value.trim()
    const status  = document.getElementById('cf-status')
    const btn     = document.querySelector('[onclick="submitContact()"]')

    if (!name || !message) {
      setStatus('⚠️ Name and message are required.', 'var(--yellow)')
      return
    }

    btn.disabled = true
    btn.textContent = 'Sending…'
    setStatus('', '')

    const embed = {
      title: `📬 New message: ${subject || '(no subject)'}`,
      color: 0x63d2be,
      fields: [
        { name: 'From', value: name, inline: true },
        { name: 'Email', value: email || 'not provided', inline: true },
        { name: 'Message', value: message },
      ],
      footer: { text: 'yumehana.dev contact form' },
      timestamp: new Date().toISOString(),
    }

    try {
      if (DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
        // Demo mode — show success without actually sending
        await new Promise(r => setTimeout(r, 800))
        setStatus('✅ Message sent! (Demo mode — configure your webhook URL to enable real delivery)', 'var(--green)')
      } else {
        const res = await fetch(DISCORD_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ embeds: [embed] }),
        })
        if (!res.ok) throw new Error('Webhook failed')
        setStatus('✅ Message sent! I\'ll reply when I\'m back online.', 'var(--green)')
        document.getElementById('cf-name').value = ''
        document.getElementById('cf-email').value = ''
        document.getElementById('cf-subject').value = ''
        document.getElementById('cf-message').value = ''
      }
    } catch (e) {
      setStatus('❌ Failed to send. Try Discord directly.', 'var(--red)')
    }

    btn.disabled = false
    btn.textContent = 'Send via Discord →'

    function setStatus(msg, color) {
      if (!status) return
      status.style.display = msg ? 'block' : 'none'
      status.style.color = color
      status.textContent = msg
    }
  }
}
