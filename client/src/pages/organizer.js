const TAB_CONFIG = [
  { id: 'todos', label: 'Todos', icon: '🗒️', accent: 'var(--accent)' },
  { id: 'calendar', label: 'Calendar', icon: '📅', accent: 'var(--accent2)' },
  { id: 'reminders', label: 'Reminders', icon: '⏰', accent: 'var(--yellow)' },
  { id: 'finance', label: 'Finance', icon: '💰', accent: 'var(--accent3)' },
  { id: 'ai', label: 'AI Chat', icon: '✨', accent: 'linear-gradient(90deg,var(--accent),var(--accent3))' },
]

const TIER_LIMITS = {
  free: 0,
  basic: 200_000,
  pro: 1_000_000,
  admin: Infinity,
}

const TIER_LABELS = {
  free: 'Free Plan',
  basic: 'Basic Plan',
  pro: 'Pro Plan',
  admin: 'Admin Access',
}

function normalizeTier(user) {
  if (user.role === 'admin') return 'admin'
  const tier = (user.subscription_tier || '').toLowerCase()
  if (tier === 'basic' || tier === 'pro') return tier
  if (user.role === 'subscriber') return 'basic'
  return 'free'
}

function formatTokens(value) {
  if (value === Infinity) return '∞'
  if (!value) return '0'
  return value.toLocaleString('en-US')
}

function formatReset(at) {
  if (!at) return 'TBD'
  const date = new Date(at * 1000)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function placeholderContent(tab, user) {
  const sharedCTA = `
    <div class="organizer-placeholder-cta">
      <p>Feature coming in Phase 2 — follow development progress or drop a message.</p>
      <button class="btn btn-primary" onclick="navigate('contact')">Follow development →</button>
    </div>`

  switch (tab) {
    case 'todos':
      return `
        <div class="organizer-placeholder">
          <h2>Structured focus lists</h2>
          <p>Plan todos by priority, due date, and project. Claude will summarize the day and suggest next actions.</p>
          <ul>
            <li>Multiple lists (personal, work, errands) with drag-to-reorder.</li>
            <li>Priority & due-date pill styling so urgent tasks stand out.</li>
            <li>Claude-powered "plan my day" button that drafts a checklist.</li>
          </ul>
          ${sharedCTA}
        </div>`
    case 'calendar':
      return `
        <div class="organizer-placeholder">
          <h2>Calendar powered by FullCalendar</h2>
          <p>Month + week views with drag-to-reschedule events, recurring schedules, and AI summaries of the week ahead.</p>
          <ul>
            <li>FullCalendar via CDN so the Pi stays lightweight.</li>
            <li>Inline modals for quick edits, color labels for contexts.</li>
            <li>Claude context injection: "What does my Friday look like?"</li>
          </ul>
          ${sharedCTA}
        </div>`
    case 'reminders':
      return `
        <div class="organizer-placeholder">
          <h2>Never miss a beat</h2>
          <p>Time- or date-based reminders with optional recurring cadences. Node-cron will mark delivered reminders server-side.</p>
          <ul>
            <li>Minute-level polling today, web push + email in Phase 5.</li>
            <li>Flexible repeat rules (daily, weekly slots, or custom cron).</li>
            <li>Delivery log so you can confirm notifications actually fired.</li>
          </ul>
          ${sharedCTA}
        </div>`
    case 'finance':
      return `
        <div class="organizer-placeholder">
          <h2>Lightweight finance ledger</h2>
          <p>Track income vs. expenses with category breakdowns, cents-safe math, and charts driven by Chart.js.</p>
          <ul>
            <li>Inline add form + CSV export for your accountant.</li>
            <li>Charts: 6-month income vs. expense bar, category donut.</li>
            <li>Claude insights: "Where did I overspend this month?"</li>
          </ul>
          ${sharedCTA}
        </div>`
    case 'ai': {
      const hasAccess = user.role === 'admin' || user.role === 'subscriber'
      return `
        <div class="organizer-placeholder">
          <h2>Claude inside your life OS</h2>
          <p>Anthropic Sonnet streams directly in this panel. Context-aware prompts pull your todos, calendar, reminders, and finance summaries.</p>
          <ul>
            <li>Server-side proxy enforces token budgets per tier.</li>
            <li>Streaming UI with EventSource for instant feedback.</li>
            <li>Context selector (General, Todos, Finance, Calendar).</li>
          </ul>
          <div class="organizer-placeholder-cta">
            ${hasAccess
              ? '<p>AI chat unlocks automatically once the Phase 3 endpoints land.</p>'
              : '<p>Upgrade from Free → Basic to unlock Claude once billing goes live.</p>'}
            <button class="btn btn-primary" onclick="navigate('contact')">Join the waitlist →</button>
          </div>
        </div>`
    }
    default:
      return ''
  }
}

export async function renderOrganizer(root) {
  root.innerHTML = `
    <section class="organizer-section">
      <div class="wrap">
        <div class="card organizer-loading">
          <div class="spinner"></div>
          <p>Checking your session…</p>
        </div>
      </div>
    </section>`

  let user = null
  try {
    const res = await fetch('/api/user/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      user = data.user
    } else if (res.status === 401) {
      showAuthPrompt(root)
      return
    } else {
      throw new Error('failed')
    }
  } catch (err) {
    showErrorState(root)
    return
  }

  if (!user) {
    showAuthPrompt(root)
    return
  }

  const tier = normalizeTier(user)
  const tierLabel = TIER_LABELS[tier] || 'Free Plan'
  const limit = TIER_LIMITS[tier] ?? 0
  const tokensUsed = user.tokens_used_month || 0
  const percent = limit && limit !== Infinity
    ? Math.min(100, Math.round((tokensUsed / limit) * 100))
    : 0
  const avatar = user.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(user.name || 'User')

  root.innerHTML = `
    <section class="organizer-section">
      <div class="wrap organizer-shell">
        <aside class="organizer-sidebar">
          <div class="card organizer-profile">
            <img src="${avatar}" alt="${user.name}" class="organizer-avatar" loading="lazy" />
            <div>
              <p class="organizer-eyebrow">Welcome back</p>
              <h2>${user.name || 'Anonymous human'}</h2>
              <p class="organizer-subtext">${user.email || 'No email on file'}</p>
            </div>
            <div class="organizer-tier" data-tier="${tier}">${tierLabel}</div>
          </div>

          <div class="card organizer-usage">
            <div class="organizer-usage-head">
              <div>
                <p class="organizer-eyebrow">Claude tokens</p>
                <strong>${formatTokens(tokensUsed)} / ${formatTokens(limit)} tokens</strong>
              </div>
              <span class="organizer-reset">Resets ${formatReset(user.tokens_reset_at)}</span>
            </div>
            <div class="organizer-token-bar">
              <div class="organizer-token-bar-fill" style="width:${limit === Infinity ? 100 : percent}%"></div>
            </div>
            ${limit === 0 ? '<p class="organizer-muted">Free tier doesn\'t include AI yet. Upgrades land with Stripe in Phase 4.</p>' : ''}
          </div>

          <nav class="organizer-sidebar-nav">
            ${TAB_CONFIG.map(t => `
              <button class="organizer-nav-btn" data-tab="${t.id}">
                <span>${t.icon}</span>${t.label}
              </button>`).join('')}
          </nav>

          ${user.role === 'admin' ? `
            <div class="card organizer-admin-card">
              <p class="organizer-eyebrow">Admin tools</p>
              <p>Pi telemetry still lives at the legacy status page.</p>
              <button class="btn btn-ghost" onclick="navigate('status')">Open status dashboard →</button>
            </div>` : ''}
        </aside>

        <div class="organizer-main">
          <div class="card organizer-hero">
            <div>
              <p class="organizer-eyebrow">Anni Organizer</p>
              <h1>Centralize todos, time, reminders, money & Claude.</h1>
              <p class="organizer-subtext">Phase 0 + 1 complete — database, auth, and shell are live. Phase 2 feature modules (todos, calendar, reminders, finance) are next.</p>
            </div>
            <div class="organizer-meta">
              <span>Signed in via ${user.provider}</span>
              <button class="btn btn-ghost" onclick="navigate('login')">Switch account</button>
            </div>
          </div>

          <div class="card organizer-tab-bar">
            ${TAB_CONFIG.map(t => `
              <button class="organizer-tab-btn" data-tab="${t.id}">
                <span class="icon">${t.icon}</span>
                <span>${t.label}</span>
              </button>`).join('')}
          </div>

          <div class="card organizer-content" id="organizer-content"></div>
        </div>
      </div>
    </section>`

  const tabButtons = root.querySelectorAll('[data-tab]')
  let currentTab = 'todos'

  function setActiveTab(next) {
    currentTab = next
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === next))
    const content = root.querySelector('#organizer-content')
    if (content) {
      content.innerHTML = placeholderContent(next, user)
    }
  }

  tabButtons.forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)))
  setActiveTab(currentTab)
}

function showAuthPrompt(root) {
  root.innerHTML = `
    <section class="organizer-section">
      <div class="wrap">
        <div class="card organizer-auth-card">
          <div>
            <h2>Sign in to continue</h2>
            <p class="organizer-subtext">Organizer is gated behind login so we can hydrate your personal data.</p>
          </div>
          <button class="btn btn-primary" onclick="navigate('login')">Go to login →</button>
        </div>
      </div>
    </section>`
}

function showErrorState(root) {
  root.innerHTML = `
    <section class="organizer-section">
      <div class="wrap">
        <div class="card organizer-auth-card">
          <div>
            <h2>Backend unavailable</h2>
            <p class="organizer-subtext">Could not reach /api/user/me. Make sure the Node server is running on the Pi.</p>
          </div>
          <button class="btn btn-ghost" onclick="navigate('contact')">Contact admin</button>
        </div>
      </div>
    </section>`
}
