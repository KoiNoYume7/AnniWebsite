// ── Calendar tab — Phase 2.2 ──
// Lightweight monthly grid, no external deps.

const EVENT_COLORS = ['#63d2be', '#4fa8d8', '#a78bfa', '#f59e0b', '#f87171', '#34d399']

let viewYear  = new Date().getFullYear()
let viewMonth = new Date().getMonth()  // 0-indexed
let events    = []
let modal     = null  // { mode: 'create'|'edit', date?, event? }

export function render(_user) {
  return `<div class="cal-wrap" id="cal-wrap"></div>`
}

export function mount(container, _user) {
  loadAndRender(container)
}

async function loadAndRender(container) {
  const wrap = container.querySelector('#cal-wrap')
  if (!wrap) return

  // Fetch full year window ± 1 month around the view
  const from = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-01`
  const nextM = viewMonth === 11 ? `${viewYear + 1}-01-01` : `${viewYear}-${String(viewMonth + 2).padStart(2, '0')}-01`

  try {
    const res = await fetch(`/api/organizer/events?from=${from}&to=${nextM}`, { credentials: 'include' })
    const json = await res.json()
    events = json.data || []
  } catch (_) {
    events = []
  }

  renderCalendar(wrap)
}

function renderCalendar(wrap) {
  const monthName = new Date(viewYear, viewMonth, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' })
  const grid = buildGrid()

  wrap.innerHTML = `
    <div class="cal-header">
      <button class="btn btn-sm btn-ghost cal-nav" id="cal-prev">‹</button>
      <span class="cal-month-label">${monthName}</span>
      <button class="btn btn-sm btn-ghost cal-nav" id="cal-next">›</button>
      <button class="btn btn-sm btn-ghost cal-today" id="cal-today">Today</button>
    </div>
    <div class="cal-grid">
      ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-day-head">${d}</div>`).join('')}
      ${grid}
    </div>
    ${modal ? renderModal() : ''}
  `

  // Nav
  wrap.querySelector('#cal-prev')?.addEventListener('click', () => {
    if (viewMonth === 0) { viewMonth = 11; viewYear-- } else { viewMonth-- }
    loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
  })
  wrap.querySelector('#cal-next')?.addEventListener('click', () => {
    if (viewMonth === 11) { viewMonth = 0; viewYear++ } else { viewMonth++ }
    loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
  })
  wrap.querySelector('#cal-today')?.addEventListener('click', () => {
    const now = new Date()
    viewYear  = now.getFullYear()
    viewMonth = now.getMonth()
    loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
  })

  // Click on a date cell (empty area) → create
  wrap.querySelectorAll('.cal-cell[data-date]').forEach(cell => {
    cell.addEventListener('click', (e) => {
      if (e.target.closest('.cal-event-pill')) return
      modal = { mode: 'create', date: cell.dataset.date }
      renderCalendar(wrap)
    })
  })

  // Click on event pill → edit
  wrap.querySelectorAll('.cal-event-pill[data-id]').forEach(pill => {
    pill.addEventListener('click', (e) => {
      e.stopPropagation()
      const id = parseInt(pill.dataset.id)
      const ev = events.find(e => e.id === id)
      if (ev) { modal = { mode: 'edit', event: ev }; renderCalendar(wrap) }
    })
  })

  // Modal wiring
  if (modal) wireModal(wrap)
}

function buildGrid() {
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const todayStr = toISODate(new Date())

  let cells = ''

  // Leading empty cells
  for (let i = 0; i < firstDay; i++) {
    cells += `<div class="cal-cell cal-cell--empty"></div>`
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const isToday = dateStr === todayStr
    const dayEvents = events.filter(e => e.start_at.startsWith(dateStr))

    cells += `
      <div class="cal-cell${isToday ? ' cal-today-cell' : ''}" data-date="${dateStr}">
        <span class="cal-day-num${isToday ? ' cal-today-num' : ''}">${d}</span>
        <div class="cal-events">
          ${dayEvents.slice(0, 3).map(ev => `
            <div class="cal-event-pill" data-id="${ev.id}"
              style="background:${ev.color || 'var(--accent)'}22;border-left:3px solid ${ev.color || 'var(--accent)'};color:${ev.color || 'var(--accent)'}">
              ${esc(ev.title)}
            </div>`).join('')}
          ${dayEvents.length > 3 ? `<div class="cal-more">+${dayEvents.length - 3} more</div>` : ''}
        </div>
      </div>`
  }

  // Trailing empty cells (fill to complete last row)
  const total = firstDay + daysInMonth
  const trailing = total % 7 === 0 ? 0 : 7 - (total % 7)
  for (let i = 0; i < trailing; i++) {
    cells += `<div class="cal-cell cal-cell--empty"></div>`
  }

  return cells
}

function renderModal() {
  const m = modal
  const isEdit = m.mode === 'edit'
  const ev = m.event || {}

  const defaultColor = ev.color || EVENT_COLORS[0]
  const defaultDate  = ev.start_at ? ev.start_at.slice(0, 10) : (m.date || toISODate(new Date()))
  const defaultTime  = ev.start_at && ev.start_at.includes('T') ? ev.start_at.slice(11, 16) : ''
  const endDate      = ev.end_at ? ev.end_at.slice(0, 10) : ''
  const endTime      = ev.end_at && ev.end_at.includes('T') ? ev.end_at.slice(11, 16) : ''

  return `
    <div class="cal-modal-backdrop" id="cal-modal-backdrop">
      <div class="cal-modal">
        <div class="cal-modal-header">
          <h3>${isEdit ? 'Edit event' : 'New event'}</h3>
          <button class="cal-modal-close" id="cal-modal-close">×</button>
        </div>
        <form class="cal-modal-form" id="cal-modal-form">
          <input class="form-input" id="cal-title" placeholder="Event title" value="${esc(ev.title || '')}" required />
          <div class="cal-modal-row">
            <label>Start</label>
            <input class="form-input" id="cal-start-date" type="date" value="${defaultDate}" required />
            <input class="form-input cal-time" id="cal-start-time" type="time" value="${defaultTime}" />
          </div>
          <div class="cal-modal-row">
            <label>End</label>
            <input class="form-input" id="cal-end-date" type="date" value="${endDate}" />
            <input class="form-input cal-time" id="cal-end-time" type="time" value="${endTime}" />
          </div>
          <div class="cal-modal-row">
            <label>Color</label>
            <div class="cal-color-row">
              ${EVENT_COLORS.map(c => `
                <button type="button" class="cal-color-swatch${defaultColor === c ? ' active' : ''}"
                  style="background:${c}" data-color="${c}"></button>`).join('')}
            </div>
          </div>
          <div class="cal-modal-actions">
            ${isEdit ? `<button type="button" class="btn btn-sm btn-ghost cal-delete-btn" id="cal-delete-btn" style="color:var(--red)">Delete</button>` : '<span></span>'}
            <div style="display:flex;gap:8px">
              <button type="button" class="btn btn-sm btn-ghost" id="cal-modal-cancel">Cancel</button>
              <button type="submit" class="btn btn-sm btn-primary">${isEdit ? 'Save' : 'Create'}</button>
            </div>
          </div>
        </form>
      </div>
    </div>`
}

function wireModal(wrap) {
  let selectedColor = modal?.event?.color || EVENT_COLORS[0]

  // Color swatches
  wrap.querySelectorAll('.cal-color-swatch').forEach(swatch => {
    swatch.addEventListener('click', () => {
      wrap.querySelectorAll('.cal-color-swatch').forEach(s => s.classList.remove('active'))
      swatch.classList.add('active')
      selectedColor = swatch.dataset.color
    })
  })

  // Close / cancel
  const close = () => { modal = null; renderCalendar(wrap) }
  wrap.querySelector('#cal-modal-close')?.addEventListener('click', close)
  wrap.querySelector('#cal-modal-cancel')?.addEventListener('click', close)
  wrap.querySelector('#cal-modal-backdrop')?.addEventListener('click', (e) => {
    if (e.target.id === 'cal-modal-backdrop') close()
  })

  // Delete
  wrap.querySelector('#cal-delete-btn')?.addEventListener('click', async () => {
    if (!modal?.event?.id) return
    try {
      await fetch(`/api/organizer/events/${modal.event.id}`, { method: 'DELETE', credentials: 'include' })
      modal = null
      await loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
    } catch (err) { console.error('[calendar] Delete failed:', err) }
  })

  // Submit
  wrap.querySelector('#cal-modal-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const title     = wrap.querySelector('#cal-title').value.trim()
    const startDate = wrap.querySelector('#cal-start-date').value
    const startTime = wrap.querySelector('#cal-start-time').value
    const endDate   = wrap.querySelector('#cal-end-date').value
    const endTime   = wrap.querySelector('#cal-end-time').value

    if (!title || !startDate) return

    const start_at = startTime ? `${startDate}T${startTime}` : startDate
    const end_at   = endDate ? (endTime ? `${endDate}T${endTime}` : endDate) : null
    const all_day  = !startTime

    const body = { title, start_at, end_at, all_day, color: selectedColor }

    try {
      if (modal.mode === 'edit') {
        await fetch(`/api/organizer/events/${modal.event.id}`, {
          method: 'PATCH', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      } else {
        await fetch('/api/organizer/events', {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
      }
      modal = null
      await loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
    } catch (err) { console.error('[calendar] Save failed:', err) }
  })
}

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
