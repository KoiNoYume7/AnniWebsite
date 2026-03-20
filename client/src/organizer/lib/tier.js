// ── Organizer tier config + helpers ──

export const TAB_CONFIG = [
  { id: 'todos',     label: 'Todos',     icon: '🗒️',  accent: 'var(--accent)'  },
  { id: 'calendar',  label: 'Calendar',  icon: '📅',  accent: 'var(--accent2)' },
  { id: 'reminders', label: 'Reminders', icon: '⏰',  accent: 'var(--yellow)'  },
  { id: 'finance',   label: 'Finance',   icon: '💰',  accent: 'var(--accent3)' },
  { id: 'ai',        label: 'AI Chat',   icon: '✨',  accent: 'linear-gradient(90deg,var(--accent),var(--accent3))' },
]

export const TIER_LIMITS = {
  free:  0,
  basic: 200_000,
  pro:   1_000_000,
  admin: Infinity,
}

export const TIER_LABELS = {
  free:  'Free Plan',
  basic: 'Basic Plan',
  pro:   'Pro Plan',
  admin: 'Admin Access',
}

export function normalizeTier(user) {
  if (user.role === 'admin') return 'admin'
  const tier = (user.subscription_tier || '').toLowerCase()
  if (tier === 'basic' || tier === 'pro') return tier
  if (user.role === 'subscriber') return 'basic'
  return 'free'
}

export function formatTokens(value) {
  if (value === Infinity) return '∞'
  if (!value) return '0'
  return value.toLocaleString('en-US')
}

export function formatReset(at) {
  if (!at) return 'TBD'
  return new Date(at * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
