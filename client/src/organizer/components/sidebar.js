// ── Organizer sidebar ──
// Returns the full sidebar HTML string: profile card, token bar, nav, admin card.

import { TAB_CONFIG, TIER_LABELS, TIER_LIMITS, normalizeTier, formatTokens, formatReset } from '../lib/tier.js'

export function buildSidebar(user) {
  const tier       = normalizeTier(user)
  const tierLabel  = TIER_LABELS[tier] || 'Free Plan'
  const limit      = TIER_LIMITS[tier] ?? 0
  const tokensUsed = user.tokens_used_month || 0
  const percent    = (limit && limit !== Infinity)
    ? Math.min(100, Math.round((tokensUsed / limit) * 100))
    : 0
  const avatar = user.avatar
    || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name || 'User')}`

  return `
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
      ${limit === 0
        ? '<p class="organizer-muted">Free tier doesn\'t include AI yet. Upgrades land with Stripe in Phase 4.</p>'
        : ''}
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
        <p>Pi telemetry lives at the legacy status page.</p>
        <button class="btn btn-ghost" onclick="navigate('status')">Open status dashboard →</button>
      </div>` : ''}
  `
}
