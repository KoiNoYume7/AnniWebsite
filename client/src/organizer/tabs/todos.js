// ── Todos tab — Phase 2.1 ──
// Full CRUD with list grouping, priorities, due dates, drag-to-reorder.

import { makeCRUD } from '../lib/api.js'

const api = makeCRUD('todos')

const PRIORITY_LABELS = ['', 'Low', 'Medium', 'High']
const PRIORITY_CLASSES = ['', 'todo-pri-low', 'todo-pri-med', 'todo-pri-high']

let todos = []
let lists = []
let activeList = null       // null = all lists
let editingId = null
let dragId = null

export function render(_user) {
  return `
    <div class="todo-wrap">
      <div class="todo-header">
        <div class="todo-lists" id="todo-lists"></div>
        <button class="btn btn-sm btn-ghost" id="todo-new-list-btn" title="New list">+ List</button>
      </div>
      <form class="todo-add" id="todo-add">
        <input class="form-input todo-add-input" id="todo-add-input" placeholder="What needs to be done?" autocomplete="off" />
        <select class="todo-add-pri" id="todo-add-pri" title="Priority">
          <option value="0">No priority</option>
          <option value="1">Low</option>
          <option value="2">Medium</option>
          <option value="3">High</option>
        </select>
        <input class="form-input todo-add-date" id="todo-add-date" type="date" title="Due date" />
        <button class="btn btn-sm btn-primary" type="submit">Add</button>
      </form>
      <div class="todo-list" id="todo-list"></div>
      <div class="todo-footer" id="todo-footer"></div>
    </div>`
}

export function mount(container, _user) {
  loadTodos(container)

  // Add todo
  const form = container.querySelector('#todo-add')
  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const input = container.querySelector('#todo-add-input')
    const pri   = container.querySelector('#todo-add-pri')
    const date  = container.querySelector('#todo-add-date')
    const title = input.value.trim()
    if (!title) return

    try {
      await api.create({
        title,
        priority: parseInt(pri.value) || 0,
        due_date: date.value || null,
        list_name: activeList || 'default',
      })
      input.value = ''
      pri.value = '0'
      date.value = ''
      input.focus()
      await loadTodos(container)
    } catch (err) {
      console.error('[todos] Create failed:', err)
    }
  })

  // New list
  container.querySelector('#todo-new-list-btn')?.addEventListener('click', () => {
    const name = prompt('New list name:')
    if (!name || !name.trim()) return
    const trimmed = name.trim().toLowerCase().replace(/\s+/g, '-')
    if (!lists.includes(trimmed)) {
      lists.push(trimmed)
    }
    activeList = trimmed
    renderLists(container)
    renderTodos(container)
  })
}

async function loadTodos(container) {
  try {
    const res = await api.list()
    todos = res.data || []
    lists = res.lists || []
    if (!lists.includes('default')) lists.unshift('default')
    renderLists(container)
    renderTodos(container)
    renderFooter(container)
  } catch (err) {
    console.error('[todos] Load failed:', err)
    container.querySelector('#todo-list').innerHTML =
      '<p class="organizer-subtext" style="padding:12px">Could not load todos. Is the server running?</p>'
  }
}

function renderLists(container) {
  const el = container.querySelector('#todo-lists')
  if (!el) return
  el.innerHTML = `
    <button class="todo-list-btn ${activeList === null ? 'active' : ''}" data-list="__all">All</button>
    ${lists.map(l => `
      <button class="todo-list-btn ${activeList === l ? 'active' : ''}" data-list="${esc(l)}">
        ${esc(l === 'default' ? 'Default' : l)}
      </button>`).join('')}
  `
  el.querySelectorAll('.todo-list-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeList = btn.dataset.list === '__all' ? null : btn.dataset.list
      renderLists(container)
      renderTodos(container)
    })
  })
}

function renderTodos(container) {
  const el = container.querySelector('#todo-list')
  if (!el) return

  const filtered = activeList
    ? todos.filter(t => t.list_name === activeList)
    : todos

  if (filtered.length === 0) {
    el.innerHTML = `<div class="todo-empty">
      <p>${activeList ? `No todos in "${esc(activeList)}"` : 'No todos yet'} — add one above.</p>
    </div>`
    return
  }

  // Group by list
  const groups = {}
  for (const t of filtered) {
    const key = t.list_name || 'default'
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }

  // Sort within each group by sort_order
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => a.sort_order - b.sort_order)
  }

  const showGroupHeaders = activeList === null && Object.keys(groups).length > 1

  el.innerHTML = Object.entries(groups).map(([listName, items]) => `
    ${showGroupHeaders ? `<div class="todo-group-label">${esc(listName === 'default' ? 'Default' : listName)}</div>` : ''}
    ${items.map(t => renderTodoItem(t)).join('')}
  `).join('')

  // Wire up events on each item
  el.querySelectorAll('.todo-item').forEach(item => {
    const id = parseInt(item.dataset.id)

    // Toggle complete
    item.querySelector('.todo-check')?.addEventListener('click', async () => {
      try {
        await api.update(id, { toggle: true })
        await loadTodos(container)
      } catch (err) { console.error('[todos] Toggle failed:', err) }
    })

    // Delete
    item.querySelector('.todo-delete')?.addEventListener('click', async () => {
      try {
        await api.remove(id)
        await loadTodos(container)
      } catch (err) { console.error('[todos] Delete failed:', err) }
    })

    // Inline edit (click title)
    item.querySelector('.todo-title')?.addEventListener('dblclick', () => {
      startEdit(container, id)
    })

    // Drag
    item.setAttribute('draggable', 'true')
    item.addEventListener('dragstart', (e) => {
      dragId = id
      item.classList.add('todo-dragging')
      e.dataTransfer.effectAllowed = 'move'
    })
    item.addEventListener('dragend', () => {
      dragId = null
      item.classList.remove('todo-dragging')
      el.querySelectorAll('.todo-drag-over').forEach(x => x.classList.remove('todo-drag-over'))
    })
    item.addEventListener('dragover', (e) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      item.classList.add('todo-drag-over')
    })
    item.addEventListener('dragleave', () => {
      item.classList.remove('todo-drag-over')
    })
    item.addEventListener('drop', async (e) => {
      e.preventDefault()
      item.classList.remove('todo-drag-over')
      if (dragId === null || dragId === id) return

      const listItems = activeList
        ? todos.filter(t => t.list_name === activeList)
        : todos.filter(t => t.list_name === todos.find(x => x.id === id)?.list_name)

      const ordered = listItems.sort((a, b) => a.sort_order - b.sort_order)
      const fromIdx = ordered.findIndex(t => t.id === dragId)
      const toIdx   = ordered.findIndex(t => t.id === id)
      if (fromIdx === -1 || toIdx === -1) return

      const [moved] = ordered.splice(fromIdx, 1)
      ordered.splice(toIdx, 0, moved)

      const items = ordered.map((t, i) => ({
        id: t.id,
        sort_order: i,
        list_name: t.list_name,
      }))

      try {
        await reorder(items)
        await loadTodos(container)
      } catch (err) { console.error('[todos] Reorder failed:', err) }
    })
  })
}

function renderTodoItem(t) {
  const isOverdue = t.due_date && !t.completed && new Date(t.due_date) < new Date(new Date().toDateString())
  const priClass = PRIORITY_CLASSES[t.priority] || ''

  return `
    <div class="todo-item ${t.completed ? 'todo-done' : ''} ${priClass} ${isOverdue ? 'todo-overdue' : ''}" data-id="${t.id}">
      <button class="todo-check" title="${t.completed ? 'Mark incomplete' : 'Mark complete'}">
        ${t.completed ? '☑' : '☐'}
      </button>
      <div class="todo-body">
        <span class="todo-title">${esc(t.title)}</span>
        <div class="todo-meta">
          ${t.priority ? `<span class="todo-pill ${priClass}">${PRIORITY_LABELS[t.priority]}</span>` : ''}
          ${t.due_date ? `<span class="todo-pill todo-date ${isOverdue ? 'todo-overdue-pill' : ''}">${formatDate(t.due_date)}</span>` : ''}
        </div>
      </div>
      <button class="todo-delete" title="Delete">×</button>
    </div>`
}

function startEdit(container, id) {
  const todo = todos.find(t => t.id === id)
  if (!todo) return
  editingId = id

  const item = container.querySelector(`.todo-item[data-id="${id}"]`)
  if (!item) return

  const body = item.querySelector('.todo-body')
  body.innerHTML = `
    <form class="todo-edit-form">
      <input class="form-input todo-edit-input" value="${esc(todo.title)}" />
      <div class="todo-edit-row">
        <select class="todo-add-pri todo-edit-pri">
          ${[0,1,2,3].map(p => `<option value="${p}" ${todo.priority === p ? 'selected' : ''}>${p === 0 ? 'No priority' : PRIORITY_LABELS[p]}</option>`).join('')}
        </select>
        <input class="form-input todo-add-date" type="date" value="${todo.due_date || ''}" />
        <select class="todo-add-pri todo-edit-list">
          ${lists.map(l => `<option value="${esc(l)}" ${todo.list_name === l ? 'selected' : ''}>${esc(l === 'default' ? 'Default' : l)}</option>`).join('')}
        </select>
        <button class="btn btn-sm btn-primary" type="submit">Save</button>
        <button class="btn btn-sm btn-ghost todo-edit-cancel" type="button">Cancel</button>
      </div>
    </form>`

  const form = body.querySelector('.todo-edit-form')
  const input = body.querySelector('.todo-edit-input')
  input.focus()
  input.select()

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const title = input.value.trim()
    if (!title) return
    try {
      await api.update(id, {
        title,
        priority: parseInt(body.querySelector('.todo-edit-pri').value) || 0,
        due_date: body.querySelector('input[type="date"]').value || null,
        list_name: body.querySelector('.todo-edit-list').value || 'default',
      })
      editingId = null
      await loadTodos(container)
    } catch (err) { console.error('[todos] Update failed:', err) }
  })

  body.querySelector('.todo-edit-cancel')?.addEventListener('click', () => {
    editingId = null
    renderTodos(container)
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      editingId = null
      renderTodos(container)
    }
  })
}

async function reorder(items) {
  const res = await fetch('/api/organizer/todos/reorder', {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error('Reorder failed')
  return res.json()
}

function renderFooter(container) {
  const el = container.querySelector('#todo-footer')
  if (!el) return
  const total = todos.length
  const done  = todos.filter(t => t.completed).length
  const open  = total - done
  if (total === 0) { el.innerHTML = ''; return }
  el.innerHTML = `<span>${open} open</span><span>${done} completed</span><span>${total} total</span>`
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}
