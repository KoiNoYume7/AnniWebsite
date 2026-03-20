// ── Reminders tab ──
// Phase 2.3 — node-cron + web push coming next. Placeholder for now.

export function render(_user) {
  return `
    <div class="organizer-placeholder">
      <h2>Never miss a beat</h2>
      <p>Time- or date-based reminders with optional recurring cadences. Node-cron marks delivered reminders server-side every minute.</p>
      <ul>
        <li>Minute-level polling today, web push + email in Phase 5.</li>
        <li>Flexible repeat rules: daily, weekly slots, or custom cron string.</li>
        <li>Delivery log so you can confirm notifications actually fired.</li>
      </ul>
      <div class="organizer-placeholder-cta">
        <p>Feature coming in Phase 2 — follow development progress or drop a message.</p>
        <button class="btn btn-primary" onclick="navigate('contact')">Follow development →</button>
      </div>
    </div>`
}
