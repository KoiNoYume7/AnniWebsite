// ── Calendar tab ──
// Phase 2.2 — FullCalendar via CDN coming next. Placeholder for now.

export function render(_user) {
  return `
    <div class="organizer-placeholder">
      <h2>Calendar powered by FullCalendar</h2>
      <p>Month + week views with drag-to-reschedule events, recurring schedules, and AI summaries of the week ahead.</p>
      <ul>
        <li>FullCalendar via CDN — no build-step bloat, loaded only when this tab opens.</li>
        <li>Inline modals for quick edits, colour labels for contexts.</li>
        <li>Claude context injection: "What does my Friday look like?"</li>
      </ul>
      <div class="organizer-placeholder-cta">
        <p>Feature coming in Phase 2 — follow the devlog for progress updates.</p>
        <button class="btn btn-primary" onclick="navigate('blog')">Read devlog →</button>
      </div>
    </div>`
}
