import 'dotenv/config'
import express from 'express'
import fetch from 'node-fetch'

import { registerSpotifyRoutes } from './routes/spotify.js'
import { registerScRoutes }       from './routes/sc.js'

const app  = express()
const PORT = process.env.PORT || 4000
const DEV_MODE    = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development'
const FRONTEND    = DEV_MODE
  ? (process.env.FRONTEND_URL_DEV || 'http://localhost:3000')
  : (process.env.FRONTEND_URL || 'https://yumehana.dev')
const ANNI_CORE_URL   = process.env.ANNI_CORE_URL   || 'http://127.0.0.1:4200'  // internal
const AUTH_PUBLIC_URL = process.env.AUTH_PUBLIC_URL || 'https://auth.yumehana.dev' // browser-facing

const ALLOWED_ORIGINS = new Set(
  DEV_MODE
    ? ['http://localhost:3000', 'http://localhost:3100']
    : ['https://yumehana.dev', 'https://sc.yumehana.dev', 'https://alos.yumehana.dev', 'https://showcase.yumehana.dev']
)

// ── Auth via AnniCore ── proxy /api/auth/me to resolve current user
async function ensureUser(req) {
  if (req._coreUser) return req._coreUser
  try {
    const r = await fetch(`${ANNI_CORE_URL}/api/auth/me`, {
      headers: { cookie: req.headers.cookie || '' },
    })
    if (!r.ok) return null
    const data = await r.json()
    req._coreUser = data.user ?? null
    return req._coreUser
  } catch {
    return null
  }
}

async function requireAuth(req, res, next) {
  const user = await ensureUser(req)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  req.user = user
  next()
}

// ── Middleware ──
app.set('trust proxy', 1)

// CORS
app.use((req, res, next) => {
  const origin = req.headers.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods',     'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use(express.json())

// ─────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────

// ── Auth — proxy everything to AnniCore ──
app.get('/api/auth/me', async (req, res) => {
  try {
    const r = await fetch(`${ANNI_CORE_URL}/api/auth/me`, {
      headers: { cookie: req.headers.cookie || '' },
    })
    const data = await r.json()
    res.status(r.status).json(data)
  } catch {
    res.status(502).json({ ok: false, error: 'Auth service unavailable' })
  }
})

app.get('/api/auth/logout', async (req, res) => {
  try {
    const r = await fetch(`${ANNI_CORE_URL}/api/auth/logout`, {
      headers: { cookie: req.headers.cookie || '' },
    })
    // Forward Set-Cookie header so the browser clears the session cookie
    const setCookie = r.headers.get('set-cookie')
    if (setCookie) res.setHeader('Set-Cookie', setCookie)
    res.json({ ok: true })
  } catch {
    res.json({ ok: true })
  }
})

app.get('/api/auth/:provider', (req, res) => {
  const qs = new URLSearchParams(req.query)
  if (!qs.get('returnTo')) qs.set('returnTo', FRONTEND)
  res.redirect(`${AUTH_PUBLIC_URL}/api/auth/${req.params.provider}?${qs.toString()}`)
})

// ── Feature routes ──
registerSpotifyRoutes(app, { FRONTEND, requireAuth })
registerScRoutes(app, { requireAuth })

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

// App metadata (dev flag, frontend URL)
app.get('/api/meta', (req, res) => {
  res.json({ ok: true, devMode: DEV_MODE, frontend: FRONTEND })
})

// POST /api/contact — forward contact form to Discord webhook
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL || ''

app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body || {}
  if (!name || !message) {
    return res.status(400).json({ ok: false, error: 'Name and message are required' })
  }

  if (!DISCORD_WEBHOOK_URL || DISCORD_WEBHOOK_URL === 'YOUR_DISCORD_WEBHOOK_URL_HERE') {
    // No webhook configured — accept silently in dev, fail in prod
    if (DEV_MODE) return res.json({ ok: true, demo: true })
    return res.status(503).json({ ok: false, error: 'Contact form is not configured yet' })
  }

  try {
    const embed = {
      title: `📬 New message: ${subject || '(no subject)'}`,
      color: 0x63d2be,
      fields: [
        { name: 'From', value: name, inline: true },
        { name: 'Email', value: email || 'not provided', inline: true },
        { name: 'Message', value: message.slice(0, 1024) },
      ],
      footer: { text: 'yumehana.dev contact form' },
      timestamp: new Date().toISOString(),
    }

    const webhookRes = await fetch(DISCORD_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
    })

    if (!webhookRes.ok) throw new Error(`Webhook returned ${webhookRes.status}`)
    res.json({ ok: true })
  } catch (err) {
    console.error('[contact] Webhook error:', err.message)
    res.status(502).json({ ok: false, error: 'Failed to deliver message' })
  }
})

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 AnniWebsite running on http://127.0.0.1:${PORT}`)
  console.log(`   Frontend:  ${FRONTEND}`)
  console.log(`   AnniCore:  ${ANNI_CORE_URL}`)
  console.log()
})
