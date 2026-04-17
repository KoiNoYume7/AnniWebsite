// ── Finance tab — Phase 2.4 ──
// Income/expense ledger with category breakdown, summary cards, and CSV export.

const CATEGORIES = ['Housing', 'Food', 'Transport', 'Health', 'Entertainment', 'Shopping', 'Utilities', 'Salary', 'Freelance', 'Investment', 'Other']

let entries    = []
let summary    = []
let categories = []
let showForm   = false
let editId     = null
let filterMonth = currentMonthStr()

export function render(_user) {
  return `<div class="fin-wrap" id="fin-wrap"></div>`
}

export function mount(container, _user) {
  loadAndRender(container)
}

async function loadAndRender(container) {
  const wrap = container.querySelector('#fin-wrap')
  if (!wrap) return

  const { from, to } = monthRange(filterMonth)
  try {
    const res = await fetch(`/api/organizer/finance?from=${from}&to=${to}`, { credentials: 'include' })
    const json = await res.json()
    entries    = json.data       || []
    summary    = json.summary    || []
    categories = json.categories || []
  } catch (_) { entries = []; summary = []; categories = [] }

  renderFinance(wrap)
}

function renderFinance(wrap) {
  const income  = summary.find(s => s.type === 'income')?.total_cents  || 0
  const expense = summary.find(s => s.type === 'expense')?.total_cents || 0
  const net     = income - expense

  wrap.innerHTML = `
    <div class="fin-header">
      <p class="organizer-eyebrow">Finance</p>
      <div class="fin-header-right">
        <input class="form-input fin-month-input" id="fin-month" type="month" value="${filterMonth}" />
        <button class="btn btn-sm btn-primary" id="fin-add-btn">${showForm ? '✕ Cancel' : '+ Add entry'}</button>
        <button class="btn btn-sm btn-ghost" id="fin-export-btn" title="Export CSV">↓ CSV</button>
      </div>
    </div>

    <div class="fin-summary-cards">
      <div class="fin-card fin-card--income">
        <span class="fin-card-label">Income</span>
        <span class="fin-card-amount">${formatMoney(income)}</span>
      </div>
      <div class="fin-card fin-card--expense">
        <span class="fin-card-label">Expenses</span>
        <span class="fin-card-amount">${formatMoney(expense)}</span>
      </div>
      <div class="fin-card ${net >= 0 ? 'fin-card--net-pos' : 'fin-card--net-neg'}">
        <span class="fin-card-label">Net</span>
        <span class="fin-card-amount">${net >= 0 ? '+' : ''}${formatMoney(net)}</span>
      </div>
    </div>

    ${showForm ? renderForm() : ''}

    ${categories.length ? `
      <div class="fin-categories">
        ${categories.map(c => `
          <div class="fin-cat-row">
            <span class="fin-cat-name">${esc(c.category || 'Uncategorized')}</span>
            <span class="fin-cat-bar-wrap">
              <span class="fin-cat-bar fin-cat-bar--${c.type}"
                style="width:${Math.min(100, Math.round(c.total_cents / Math.max(income, expense, 1) * 100))}%"></span>
            </span>
            <span class="fin-cat-amount fin-${c.type}">${c.type === 'expense' ? '-' : '+'}${formatMoney(c.total_cents)}</span>
          </div>`).join('')}
      </div>` : ''}

    <div class="fin-ledger">
      ${entries.length === 0 ? `<div class="rem-empty"><p>No entries for ${filterMonth} — add one above.</p></div>` : ''}
      ${entries.map(e => renderEntry(e)).join('')}
    </div>
  `

  // Month filter
  wrap.querySelector('#fin-month')?.addEventListener('change', (ev) => {
    filterMonth = ev.target.value
    loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
  })

  // Toggle form
  wrap.querySelector('#fin-add-btn')?.addEventListener('click', () => {
    showForm = !showForm; editId = null
    renderFinance(wrap)
    if (showForm) wrap.querySelector('#fin-amount')?.focus()
  })

  // CSV export
  wrap.querySelector('#fin-export-btn')?.addEventListener('click', () => exportCSV())

  if (showForm) wireForm(wrap)

  wrap.querySelectorAll('.fin-entry-edit').forEach(btn => {
    const id = parseInt(btn.dataset.id)
    btn.addEventListener('click', () => { editId = id; showForm = true; renderFinance(wrap) })
  })

  wrap.querySelectorAll('.fin-entry-delete').forEach(btn => {
    const id = parseInt(btn.dataset.id)
    btn.addEventListener('click', async () => {
      await fetch(`/api/organizer/finance/${id}`, { method: 'DELETE', credentials: 'include' })
      await loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
    })
  })
}

function renderForm() {
  const e = editId ? entries.find(x => x.id === editId) : null
  const defaultDate = e ? e.entry_date : filterMonth + '-01'

  return `
    <form class="fin-form" id="fin-form">
      <div class="fin-form-row">
        <select class="todo-add-pri" id="fin-type" required>
          <option value="expense" ${(!e || e.type === 'expense') ? 'selected' : ''}>Expense</option>
          <option value="income"  ${e?.type === 'income' ? 'selected' : ''}>Income</option>
        </select>
        <input class="form-input fin-amount-input" id="fin-amount" type="number" step="0.01" min="0"
          placeholder="0.00" value="${e ? (e.amount_cents / 100).toFixed(2) : ''}" required />
        <select class="todo-add-pri" id="fin-cat">
          <option value="">Category</option>
          ${CATEGORIES.map(c => `<option value="${c}" ${e?.category === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <input class="form-input" id="fin-date" type="date" value="${defaultDate}" required />
      </div>
      <div class="fin-form-row">
        <input class="form-input fin-desc-input" id="fin-desc" placeholder="Description (optional)" value="${esc(e?.description || '')}" />
        <button class="btn btn-sm btn-primary" type="submit">${editId ? 'Save' : 'Add'}</button>
        ${editId ? `<button class="btn btn-sm btn-ghost" type="button" id="fin-cancel">Cancel</button>` : ''}
      </div>
    </form>`
}

function wireForm(wrap) {
  wrap.querySelector('#fin-cancel')?.addEventListener('click', () => {
    showForm = false; editId = null; renderFinance(wrap)
  })

  wrap.querySelector('#fin-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const type     = wrap.querySelector('#fin-type').value
    const amount   = wrap.querySelector('#fin-amount').value
    const category = wrap.querySelector('#fin-cat').value
    const date     = wrap.querySelector('#fin-date').value
    const desc     = wrap.querySelector('#fin-desc').value.trim()

    if (!amount || !date) return

    const payload = { type, amount: parseFloat(amount), category: category || null, description: desc || null, entry_date: date }

    if (editId) {
      await fetch(`/api/organizer/finance/${editId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/organizer/finance', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    }
    showForm = false; editId = null
    await loadAndRender(wrap.closest('.organizer-content') || wrap.parentElement)
  })
}

function renderEntry(e) {
  const isIncome = e.type === 'income'
  return `
    <div class="fin-entry">
      <span class="fin-entry-date">${e.entry_date}</span>
      <span class="fin-entry-cat">${esc(e.category || '—')}</span>
      <span class="fin-entry-desc">${esc(e.description || '')}</span>
      <span class="fin-entry-amount ${isIncome ? 'fin-income' : 'fin-expense'}">
        ${isIncome ? '+' : '-'}${formatMoney(e.amount_cents)}
      </span>
      <div class="fin-entry-actions">
        <button class="fin-entry-edit btn btn-sm btn-ghost" data-id="${e.id}" title="Edit">✎</button>
        <button class="fin-entry-delete btn btn-sm btn-ghost" data-id="${e.id}" title="Delete" style="color:var(--red)">×</button>
      </div>
    </div>`
}

function exportCSV() {
  const header = 'Date,Type,Category,Description,Amount\n'
  const rows = entries.map(e =>
    `${e.entry_date},${e.type},${e.category || ''},${JSON.stringify(e.description || '')},${ (e.amount_cents / 100).toFixed(2)}`
  ).join('\n')
  const blob = new Blob([header + rows], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = `finance-${filterMonth}.csv`; a.click()
  URL.revokeObjectURL(url)
}

function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to   = `${y}-${String(m).padStart(2, '0')}-${lastDay}`
  return { from, to }
}

function currentMonthStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatMoney(cents) {
  return (cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
