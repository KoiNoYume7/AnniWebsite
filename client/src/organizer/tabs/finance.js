// ── Finance tab ──
// Phase 2.4 — income/expense ledger + Chart.js coming next. Placeholder for now.

export function render(_user) {
  return `
    <div class="organizer-placeholder">
      <h2>Lightweight finance ledger</h2>
      <p>Track income vs. expenses with category breakdowns, cents-safe math, and charts driven by Chart.js.</p>
      <ul>
        <li>Inline add form + CSV export for your accountant.</li>
        <li>Charts: 6-month income vs. expense bar, category doughnut.</li>
        <li>Claude insights: "Where did I overspend this month?"</li>
      </ul>
      <div class="organizer-placeholder-cta">
        <p>Feature coming in Phase 2 — follow development progress or drop a message.</p>
        <button class="btn btn-primary" onclick="navigate('contact')">Follow development →</button>
      </div>
    </div>`
}
