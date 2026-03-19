// ── Organizer API helpers ──
// All fetch calls to /api/organizer/* and /api/user/* live here.
// Pages and tabs import from this file — never fetch directly.

// ── Auth ──

export async function fetchUser() {
  const res = await fetch('/api/user/me', { credentials: 'include' })
  if (res.status === 401) return { auth: false, user: null }
  if (!res.ok) throw new Error(`/api/user/me returned ${res.status}`)
  const data = await res.json()
  return { auth: true, user: data.user }
}

// ── Generic CRUD factory ──
// Usage: const { list, create, update, remove } = makeCRUD('todos')

export function makeCRUD(resource) {
  const base = `/api/organizer/${resource}`

  return {
    list:   ()         => apiFetch(base),
    create: (body)     => apiFetch(base, 'POST', body),
    update: (id, body) => apiFetch(`${base}/${id}`, 'PATCH', body),
    remove: (id)       => apiFetch(`${base}/${id}`, 'DELETE'),
  }
}

async function apiFetch(url, method = 'GET', body) {
  const opts = {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(url, opts)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `API error ${res.status}`)
  }
  return res.json()
}
