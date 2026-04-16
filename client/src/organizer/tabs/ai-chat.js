// ── AI Chat tab ──
// Phase 3 — Claude streaming chat with context injection. Placeholder for now.

export function render(user) {
  const hasAccess = user.role === 'admin' || user.role === 'subscriber'

  return `
    <div class="organizer-placeholder">
      <h2>Claude inside your life OS</h2>
      <p>Anthropic Sonnet streams directly in this panel. Context-aware prompts pull your todos, calendar, reminders, and finance summaries so answers are actually useful.</p>
      <ul>
        <li>Server-side proxy enforces per-user token budgets — API key never touches the client.</li>
        <li>Streaming UI with EventSource for instant feedback as Claude types.</li>
        <li>Context selector: General, Todos help, Finance help, Calendar help.</li>
      </ul>
      <div class="organizer-placeholder-cta">
        ${hasAccess
          ? '<p>AI chat unlocks automatically once the Phase 3 endpoints land.</p>'
          : '<p>Upgrade from Free → Basic to unlock Claude once billing goes live in Phase 4.</p>'}
        <button class="btn btn-primary" onclick="navigate('blog')">Read devlog →</button>
      </div>
    </div>`
}
