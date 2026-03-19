import 'dotenv/config'
import express from 'express'
import session from 'express-session'
import connectSQLite3 from 'connect-sqlite3'
import fetch from 'node-fetch'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'

import db from './db/db.js'

const app  = express()
const PORT = process.env.PORT || 4000
const DEV_MODE = process.env.DEV_MODE === 'true' || process.env.NODE_ENV === 'development'
const FRONTEND = DEV_MODE
  ? (process.env.FRONTEND_URL_DEV || 'http://localhost:3000')
  : (process.env.FRONTEND_URL || 'https://yumehana.dev')
const SQLiteStore = connectSQLite3(session)
const SESSION_DB_DIR = path.resolve('./db')
if (!fs.existsSync(SESSION_DB_DIR)) {
  fs.mkdirSync(SESSION_DB_DIR, { recursive: true })
}

const getUserById = db.prepare('SELECT * FROM users WHERE id = ?')
const insertUserStmt = db.prepare(`
  INSERT INTO users (id, provider, provider_id, name, avatar, email, role, tokens_reset_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`)
const updateUserStmt = db.prepare(`
  UPDATE users SET
    name = ?,
    avatar = ?,
    email = ?,
    role = ?,
    updated_at = unixepoch()
  WHERE id = ?
`)
const updateRoleStmt = db.prepare(`
  UPDATE users SET
    role = ?,
    updated_at = unixepoch()
  WHERE id = ?
`)

function nextMonthResetEpoch() {
  const now = new Date()
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0))
  return Math.floor(next.getTime() / 1000)
}

function toSessionUser(row) {
  return {
    id: row.id,
    provider: row.provider,
    name: row.name,
    avatar: row.avatar,
    email: row.email,
    role: row.role,
    subscription_status: row.subscription_status,
    subscription_tier: row.subscription_tier,
    tokens_used_month: row.tokens_used_month,
    tokens_reset_at: row.tokens_reset_at,
  }
}

function ensureSessionUser(req) {
  if (req.currentUser) return req.currentUser
  if (!req.session?.user) return null
  const dbUser = getUserById.get(req.session.user.id)
  if (!dbUser) return null
  const sessionUser = toSessionUser(dbUser)
  req.session.user = sessionUser
  req.currentUser = sessionUser
  return sessionUser
}

function requireAuth(req, res, next) {
  const user = ensureSessionUser(req)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

function requireSubscriber(req, res, next) {
  const user = ensureSessionUser(req)
  if (!user) return res.status(401).json({ error: 'Not authenticated' })
  if (user.role !== 'subscriber' && user.role !== 'admin') {
    return res.status(403).json({ error: 'Subscription required' })
  }
  next()
}

function upsertUser(providerName, providerUserId, normalizedUser, isAdmin) {
  const userId = `${providerName}:${providerUserId}`
  const existing = getUserById.get(userId)
  const email = normalizedUser.email || existing?.email || null

  if (!existing) {
    insertUserStmt.run(
      userId,
      providerName,
      providerUserId,
      normalizedUser.name,
      normalizedUser.avatar || null,
      email,
      isAdmin ? 'admin' : 'free',
      nextMonthResetEpoch()
    )
    return getUserById.get(userId)
  }

  const nextRole = existing.role === 'admin'
    ? 'admin'
    : isAdmin
      ? 'admin'
      : existing.role

  updateUserStmt.run(
    normalizedUser.name,
    normalizedUser.avatar || null,
    email,
    nextRole,
    userId
  )
  return getUserById.get(userId)
}

// ── Admin promotion lists (legacy whitelist) ──
const allowed = {
  github:  new Set((process.env.GITHUB_ALLOWED_IDS  || '').split(',').map(s => s.trim()).filter(Boolean)),
  discord: new Set((process.env.DISCORD_ALLOWED_IDS || '').split(',').map(s => s.trim()).filter(Boolean)),
  google:  new Set((process.env.GOOGLE_ALLOWED_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean)),
}

// ── OAuth configs ──
const providers = {
  github: {
    authUrl:    'https://github.com/login/oauth/authorize',
    tokenUrl:   'https://github.com/login/oauth/access_token',
    userUrl:    'https://api.github.com/user',
    clientId:   process.env.GITHUB_CLIENT_ID,
    secret:     process.env.GITHUB_CLIENT_SECRET,
    scope:      'read:user',
    isAllowed:  (user) => allowed.github.has(String(user.id)),
    normalize:  (user) => ({
      id:       String(user.id),
      name:     user.login,
      avatar:   user.avatar_url,
      email:    user.email || null,
    }),
  },
  discord: {
    authUrl:    'https://discord.com/oauth2/authorize',
    tokenUrl:   'https://discord.com/api/oauth2/token',
    userUrl:    'https://discord.com/api/users/@me',
    clientId:   process.env.DISCORD_CLIENT_ID,
    secret:     process.env.DISCORD_CLIENT_SECRET,
    scope:      'identify',
    isAllowed:  (user) => allowed.discord.has(String(user.id)),
    normalize:  (user) => ({
      id:       String(user.id),
      name:     user.username,
      avatar:   user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      email:    null,
    }),
  },
  google: {
    authUrl:    'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl:   'https://oauth2.googleapis.com/token',
    userUrl:    'https://www.googleapis.com/oauth2/v3/userinfo',
    clientId:   process.env.GOOGLE_CLIENT_ID,
    secret:     process.env.GOOGLE_CLIENT_SECRET,
    scope:      'openid email profile',
    isAllowed:  (user) => allowed.google.has(user.email),
    normalize:  (user) => ({
      id:       user.sub,
      name:     user.name,
      avatar:   user.picture || null,
      email:    user.email || null,
    }),
  },
}

// ── Middleware ──
app.set('trust proxy', 1)  // trust nginx reverse proxy

app.use(session({
  store: new SQLiteStore({ db: 'sessions.db', dir: SESSION_DB_DIR }),
  secret:            process.env.SESSION_SECRET || 'change-me-in-production',
  resave:            false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly:  true,
    secure:    'auto',
    sameSite:  'lax',
    maxAge:    7 * 24 * 60 * 60 * 1000,
  },
}))

// CORS — only allow requests from our frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',      FRONTEND)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Methods',     'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

app.use(express.json())

// ── State store for CSRF protection (in-memory, fine for single instance) ──
const oauthStates = new Map()

function generateState(provider) {
  const state = crypto.randomBytes(16).toString('hex')
  oauthStates.set(state, { provider, expires: Date.now() + 10 * 60 * 1000 })
  // clean up old states
  for (const [k, v] of oauthStates) {
    if (v.expires < Date.now()) oauthStates.delete(k)
  }
  return state
}

function validateState(state) {
  const entry = oauthStates.get(state)
  if (!entry || entry.expires < Date.now()) return null
  oauthStates.delete(state)
  return entry.provider
}

// ─────────────────────────────────────────────
//  ROUTES
// ─────────────────────────────────────────────

// GET /api/auth/me — returns current session user or 401
app.get('/api/auth/me', (req, res) => {
  const user = ensureSessionUser(req)
  if (!user) return res.status(401).json({ ok: false, error: 'Not authenticated' })
  res.json({ ok: true, user })
})

// GET /api/user/me — returns full DB user record
app.get('/api/user/me', requireAuth, (req, res) => {
  const user = getUserById.get(req.session.user.id)
  if (!user) return res.status(404).json({ ok: false, error: 'User not found' })
  res.json({ ok: true, user })
})

// GET /api/auth/:provider — kick off OAuth flow
app.get('/api/auth/:provider', (req, res) => {
  const p = providers[req.params.provider]
  if (!p) return res.status(404).json({ error: 'Unknown provider' })
  if (!p.clientId) return res.status(500).json({ error: `${req.params.provider} OAuth not configured` })

  const state       = generateState(req.params.provider)
  const callbackUrl = `${FRONTEND}/api/auth/callback/${req.params.provider}`

  const params = new URLSearchParams({
    client_id:     p.clientId,
    redirect_uri:  callbackUrl,
    scope:         p.scope,
    state,
    response_type: 'code',
  })

  // Google needs extra params
  if (req.params.provider === 'google') {
    params.set('access_type', 'online')
    params.set('prompt', 'select_account')
  }

  res.redirect(`${p.authUrl}?${params}`)
})

// GET /api/auth/callback/:provider — OAuth callback
app.get('/api/auth/callback/:provider', async (req, res) => {
  const { code, state, error } = req.query

  if (error) {
    return res.redirect(`${FRONTEND}/#/login?error=${encodeURIComponent(error)}`)
  }

  const providerName = validateState(state)
  if (!providerName || providerName !== req.params.provider) {
    return res.redirect(`${FRONTEND}/#/login?error=invalid_state`)
  }

  const p = providers[providerName]
  const callbackUrl = `${FRONTEND}/api/auth/callback/${providerName}`

  try {
    // Exchange code for access token
    const tokenBody = new URLSearchParams({
      client_id:     p.clientId,
      client_secret: p.secret,
      code,
      redirect_uri:  callbackUrl,
      grant_type:    'authorization_code',
    })

    const tokenRes = await fetch(p.tokenUrl, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept':       'application/json',
      },
      body: tokenBody,
    })

    const tokenData = await tokenRes.json()
    const accessToken = tokenData.access_token

    if (!accessToken) {
      console.error(`[${providerName}] Token exchange failed:`, tokenData)
      return res.redirect(`${FRONTEND}/#/login?error=token_failed`)
    }

    // Fetch user info
    const userRes = await fetch(p.userUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept':        'application/json',
        'User-Agent':    'AnniWebsite/1.0',
      },
    })
    const rawUser = await userRes.json()

    const normalizedUser = p.normalize(rawUser)
    const providerUserId = normalizedUser.id
    const isAdmin = p.isAllowed(rawUser)
    const dbUser = upsertUser(providerName, providerUserId, normalizedUser, isAdmin)
    req.session.user = toSessionUser(dbUser)
    req.session.save((err) => {
      if (err) {
        console.error('Session save error:', err)
        return res.redirect(`${FRONTEND}/#/login?error=session_error`)
      }
      console.log(`[${providerName}] Login success:`, req.session.user.name)
      res.redirect(`${FRONTEND}/#/organizer`)
    })

  } catch (err) {
    console.error(`[${providerName}] OAuth error:`, err)
    res.redirect(`${FRONTEND}/#/login?error=server_error`)
  }
})

// GET /api/auth/logout
app.get('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true })
  })
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, uptime: process.uptime() })
})

// App metadata (dev flag, frontend URL)
app.get('/api/meta', (req, res) => {
  res.json({ ok: true, devMode: DEV_MODE, frontend: FRONTEND })
})

// ── Start ──
if (DEV_MODE) {
  console.log('⚙️  DEV_MODE enabled — /api/dev/login available for local testing')
  app.post('/api/dev/login', (req, res) => {
    const { name = 'Dev User', email = 'dev@example.com', role = 'admin' } = req.body || {}
    const normalizedRole = ['admin', 'subscriber', 'free'].includes(String(role).toLowerCase())
      ? String(role).toLowerCase()
      : 'admin'

    const providerUserId = crypto.randomUUID()
    const normalizedUser = {
      id: providerUserId,
      name,
      avatar: null,
      email,
    }

    const dbUser = upsertUser('dev', providerUserId, normalizedUser, normalizedRole === 'admin')
    if (dbUser.role !== normalizedRole) {
      updateRoleStmt.run(normalizedRole, dbUser.id)
    }
    const freshUser = getUserById.get(dbUser.id)
    const sessionUser = toSessionUser(freshUser)
    req.session.user = sessionUser
    res.json({ ok: true, user: sessionUser, devMode: true })
  })
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n🚀 AnniBackend running on http://127.0.0.1:${PORT}`)
  console.log(`   Frontend: ${FRONTEND}`)
  console.log(`   GitHub:   ${providers.github.clientId  ? '✅ configured' : '⚠️  not configured'}`)
  console.log(`   Discord:  ${providers.discord.clientId ? '✅ configured' : '⚠️  not configured'}`)
  console.log(`   Google:   ${providers.google.clientId  ? '✅ configured' : '⚠️  not configured'}`)
  console.log()
})
