// ── Organizer dashboard — entry point ──
// Auth-gated. Renders the shell (sidebar + tab area) and mounts tab modules.
// Add new tabs by dropping a file in ./tabs/ and registering it in TAB_RENDERERS below.

import { fetchUser }    from './lib/api.js'
import { TAB_CONFIG }   from './lib/tier.js'
import { buildSidebar } from './components/sidebar.js'

import { render as renderTodos,    mount as mountTodos }    from './tabs/todos.js'
import { render as renderCalendar, mount as mountCalendar } from './tabs/calendar.js'
import { render as renderReminders, mount as mountReminders } from './tabs/reminders.js'
import { render as renderFinance,   mount as mountFinance }   from './tabs/finance.js'
import { render as renderAiChat }    from './tabs/ai-chat.js'

const TAB_RENDERERS = {
  todos:     renderTodos,
  calendar:  renderCalendar,
  reminders: renderReminders,
  finance:   renderFinance,
  ai:        renderAiChat,
}

const TAB_MOUNTS = {
  todos:     mountTodos,
  calendar:  mountCalendar,
  reminders: mountReminders,
  finance:   mountFinance,
}

export async function renderOrganizer(root) {
  // Loading state
  root.innerHTML = `
    <section class="organizer-section">
      <div class="wrap">
        <div class="card organizer-loading">
          <div class="spinner"></div>
          <p>Checking your session…</p>
        </div>
      </div>
    </section>`

  // Auth check
  let user = null
  try {
    const result = await fetchUser()
    if (!result.auth) { showAuthPrompt(root); return }
    user = result.user
  } catch (_) {
    showErrorState(root)
    return
  }
  if (!user) { showAuthPrompt(root); return }

  // Render shell
  root.innerHTML = `
    <section class="organizer-section">
      <div class="wrap organizer-shell">

        <aside class="organizer-sidebar">
          ${buildSidebar(user)}
        </aside>

        <div class="organizer-main">
          <div class="card organizer-hero">
            <div>
              <p class="organizer-eyebrow">Anni Organizer</p>
              <h1>Centralize todos, time, reminders, money & Claude.</h1>
              <p class="organizer-subtext">
                Todos, Calendar, Reminders, and Finance are live.
                AI Chat (Phase 3) is next.
              </p>
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

  // Tab switching
  const tabButtons = root.querySelectorAll('[data-tab]')
  let currentTab = 'todos'

  function setActiveTab(next) {
    currentTab = next
    tabButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.tab === next))
    const content = root.querySelector('#organizer-content')
    if (content) {
      const fn = TAB_RENDERERS[next]
      content.innerHTML = fn ? fn(user) : ''
      const mountFn = TAB_MOUNTS[next]
      if (mountFn) mountFn(content, user)
    }
  }

  tabButtons.forEach(btn => btn.addEventListener('click', () => setActiveTab(btn.dataset.tab)))
  setActiveTab(currentTab)
}

// ── Auth / error states ──

function showAuthPrompt(root) {
  root.innerHTML = `
    <section class="organizer-section">
      <div class="wrap">
        <div class="card organizer-auth-card">
          <div>
            <h2>Sign in to continue</h2>
            <p class="organizer-subtext">The Organizer is gated behind login so we can hydrate your personal data.</p>
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
            <p class="organizer-subtext">Could not reach /api/user/me. Make sure the Node server is running on port 4000.</p>
          </div>
          <button class="btn btn-ghost" onclick="navigate('contact')">Contact admin</button>
        </div>
      </div>
    </section>`
}
