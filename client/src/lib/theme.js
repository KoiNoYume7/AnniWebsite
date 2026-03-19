// ── Theme management (dark / light) ──

import { showToast } from './toast.js'

export function initTheme() {
  const saved = localStorage.getItem('theme') || 'dark'
  document.documentElement.setAttribute('data-theme', saved)
}

export function toggleTheme() {
  const curr = document.documentElement.getAttribute('data-theme')
  const next = curr === 'dark' ? 'light' : 'dark'
  document.documentElement.setAttribute('data-theme', next)
  localStorage.setItem('theme', next)
  document.querySelectorAll('.theme-toggle-label').forEach(el => {
    el.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark'
  })
  showToast(next === 'light' ? '☀️ Light mode on' : '🌙 Dark mode on')
}

// Expose globally for inline onclick in nav
window.toggleTheme = toggleTheme
