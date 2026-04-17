// ── Reminders tab — Phase 2.3 ──
// CRUD list with upcoming / past sections, in-browser polling for due alerts.

let reminders = []
let pollTimer = null
let showForm  = false
let editId    = null

export function render(_user) {
  return `<div class="rem-wrap" id="rem-wrap"></div>`
}

export function mount(container, _user) {
  loadAndRender(container)
  startPoll(container)
}

async function loadAndRender(container) {
  const wrap = container.querySelector('#rem-wrap')
  if (!wrap) return
  try {
    const res = await fetch('/api/organizer/reminders', { credentials: 'include' })
    const json = await res.json()
    reminders = json.data || []
  } catch (_) { reminders = [] }
  renderReminders(wrap)
}

function renderReminders(wrap) {
  const now = new Date()
  const upcoming = reminders.filter(r => !r.delivered && new Date(r.remind_at) >= now)
    .sort((a, b) => new Date(a.remind_at) - new Date(b.remind_at))
  const overdue  = reminders.filter(r => !r.delivered && new Date(r.remind_at) < now)
    .sort((a, b) => new Date(b.remind_at) - new Date(a.remind_at))
  const done     = reminders.filter(r => r.delivered)
    .sort((a, b) => new Date(b.remind_at) - new Date(a.remind_at))

  wrap.innerHTML = `
    <div class="rem-header">
      <p class="organizer-eyebrow">Reminders</p>
      <button class="btn btn-sm btn-primary" id="rem-add-btn">${showForm ? '✕ Cancel' : '+ New reminder'}</button>
    </div>

    ${showForm ? renderForm() : ''}

    ${overdue.length ? `
      <div class="rem-section">
        <div class="rem-section-label rem-label--overdue">🔔 Due now (${overdue.length})</div>
        ${overdue.map(r => renderItem(r, true)).join('')}
      </div>` : ''}

    ${upcoming.length ? `
      <div class="rem-section">
        <div class="rem-section-label">Upcoming</div>
        ${upcoming.map(r => renderItem(r, false)).join('')}
      </div>` : ''}

    ${!overdue.length && !upcoming.length ? `
      <div class="rem-empty"><p>No active reminders — add one above.</p></div>` : ''}

    ${done.length ? `
      <details class="rem-done-section">
        <summary class="rem-section-label rem-label--done">Delivered (${done.length})</summary>
        ${done.slice(0, 10).map(r => renderItem(r, false, true)).join('')}
      </details>` : ''}
  `

  // Toggle form
  wrap.querySelector('#rem-add-btn')?.addEventListener('click', () => {
    showForm = !showForm
    editId = null
    renderReminders(wrap)
    if (showForm) wrap.querySelector('#rem-title')?.focus()
  })

  // Form submit
  if (showForm) wireForm(wrap)

  // Item buttons
  wrap.querySelectorAll('.rem-dismiss').forEach(btn => {
    const id = parseInt(btn.dataset.id)
    btn.addEventListener('click', async () => {
      await fetch(`/api/organizer/reminders/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delivered: true }),
      })
      await loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
    })
  })

  wrap.querySelectorAll('.rem-delete').forEach(btn => {
    const id = parseInt(btn.dataset.id)
    btn.addEventListener('click', async () => {
      await fetch(`/api/organizer/reminders/${id}`, { method: 'DELETE', credentials: 'include' })
      await loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
    })
  })

  wrap.querySelectorAll('.rem-edit').forEach(btn => {
    const id = parseInt(btn.dataset.id)
    btn.addEventListener('click', () => {
      editId = id; showForm = true
      renderReminders(wrap)
      wrap.querySelector('#rem-title')?.focus()
    })
  })
}

function renderForm() {
  const r = editId ? reminders.find(x => x.id === editId) : null
  const defaultDT = r ? r.remind_at.replace(' ', 'T').slice(0, 16) : ''

  return `
    <form class="rem-form" id="rem-form">
      <input class="form-input" id="rem-title" placeholder="Reminder title" value="${esc(r?.title || '')}" required />
      <input class="form-input rem-form-body" id="rem-body" placeholder="Note (optional)" value="${esc(r?.body || '')}" />
      <div class="rem-form-row">
        <input class="form-input" id="rem-dt" type="datetime-local" value="${defaultDT}" required />
        <select class="todo-add-pri" id="rem-repeat" title="Repeat">
          <option value="" ${!r?.repeat_cron ? 'selected' : ''}>No repeat</option>
          <option value="0 9 * * *"  ${r?.repeat_cron === '0 9 * * *'  ? 'selected' : ''}>Daily at 9am</option>
          <option value="0 9 * * 1"  ${r?.repeat_cron === '0 9 * * 1'  ? 'selected' : ''}>Weekly (Mon)</option>
          <option value="0 9 1 * *"  ${r?.repeat_cron === '0 9 1 * *'  ? 'selected' : ''}>Monthly (1st)</option>
        </select>
        <button class="btn btn-sm btn-primary" type="submit">${editId ? 'Save' : 'Add'}</button>
      </div>
    </form>`
}

function wireForm(wrap) {
  wrap.querySelector('#rem-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const title      = wrap.querySelector('#rem-title').value.trim()
    const body       = wrap.querySelector('#rem-body').value.trim()
    const dt         = wrap.querySelector('#rem-dt').value
    const repeatCron = wrap.querySelector('#rem-repeat').value

    if (!title || !dt) return

    const payload = {
      title,
      body: body || null,
      remind_at: dt.replace('T', ' '),
      repeat_cron: repeatCron || null,
    }

    if (editId) {
      await fetch(`/api/organizer/reminders/${editId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/organizer/reminders', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    showForm = false; editId = null
    await loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
  })
}

function renderItem(r, isOverdue, isDone = false) {
  const dt = new Date(r.remind_at)
  const dateStr = dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const timeStr = dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return `
    <div class="rem-item ${isOverdue ? 'rem-item--overdue' : ''} ${isDone ? 'rem-item--done' : ''}">
      <div class="rem-icon">${isDone ? '✓' : isOverdue ? '🔔' : '⏰'}</div>
      <div class="rem-body">
        <span class="rem-title">${esc(r.title)}</span>
        ${r.body ? `<span class="rem-note">${esc(r.body)}</span>` : ''}
        <span class="rem-time">${dateStr} at ${timeStr}${r.repeat_cron ? ' · repeating' : ''}</span>
      </div>
      <div class="rem-actions">
        ${!isDone ? `<button class="rem-dismiss btn btn-sm btn-ghost" data-id="${r.id}" title="Mark delivered">✓</button>` : ''}
        ${!isDone ? `<button class="rem-edit btn btn-sm btn-ghost" data-id="${r.id}" title="Edit">✎</button>` : ''}
        <button class="rem-delete btn btn-sm btn-ghost" data-id="${r.id}" title="Delete" style="color:var(--red)">×</button>
      </div>
    </div>`
}

// Poll every 60s — show browser Notification if a reminder becomes due
function startPoll(container) {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    const wrap = container.querySelector('#rem-wrap')
    if (!wrap) { clearInterval(pollTimer); return }

    const prev = reminders.map(r => r.id + ':' + r.delivered).join(',')
    try {
      const res = await fetch('/api/organizer/reminders', { credentials: 'include' })
      const json = await res.json()
      reminders = json.data || []
    } catch (_) { return }

    const now = new Date()
    const dueNow = reminders.filter(r => !r.delivered && new Date(r.remind_at) <= now)
    const curr = reminders.map(r => r.id + ':' + r.delivered).join(',')

    if (curr !== prev) renderReminders(wrap)

    // Browser notification if permission granted
    if (dueNow.length && Notification.permission === 'granted') {
      dueNow.forEach(r => new Notification(`⏰ ${r.title}`, { body: r.body || '', icon: '/favicon.ico' }))
    }
  }, 60_000)
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
