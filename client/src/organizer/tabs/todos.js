// ── Todos tab ──
// Phase 2.1 — full CRUD coming next. Placeholder for now.

export function render(_user) {
  return `
    <div class="organizer-placeholder">
      <h2>Structured focus lists</h2>
      <p>Plan todos by priority, due date, and project. Claude will summarise the day and suggest next actions.</p>
      <ul>
        <li>Multiple lists (personal, work, errands) with drag-to-reorder.</li>
        <li>Priority & due-date pill styling so urgent tasks stand out.</li>
        <li>Claude-powered "plan my day" button that drafts a checklist.</li>
      </ul>
      <div class="organizer-placeholder-cta">
        <p>Feature coming in Phase 2 — follow development progress or drop a message.</p>
        <button class="btn btn-primary" onclick="navigate('contact')">Follow development →</button>
      </div>
    </div>`
}
