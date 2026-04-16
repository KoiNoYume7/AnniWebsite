// ── Spotify "Now Playing" integration ──
// Single-user: admin does a one-time OAuth to get a refresh token, stored in .env.
// The server auto-refreshes access tokens (they expire in 1 hour).
// SSE streaming: server polls Spotify every 10s, pushes changes to connected clients.
// Public endpoints: /api/spotify/now-playing, /api/spotify/stream, /api/spotify/top-tracks
// Admin-only: /api/spotify/auth, /api/spotify/callback (one-time setup)

import fetch from 'node-fetch'
import crypto from 'crypto'
import fs from 'fs'
import path from 'path'

const SPOTIFY_CLIENT_ID     = process.env.SPOTIFY_CLIENT_ID || ''
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || ''
const SPOTIFY_REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN || ''

// In-memory token cache — survives until server restart, then re-fetches
let accessToken  = null
let tokenExpires = 0  // unix ms

// CSRF state for the OAuth flow
const oauthStates = new Map()

// ── SSE state ──
const sseClients = new Set()
let cachedState = { ok: true, playing: false }
let pollInterval = null

// ── Token management ──

async function getAccessToken() {
  if (accessToken && Date.now() < tokenExpires - 60_000) {
    return accessToken
  }

  if (!SPOTIFY_REFRESH_TOKEN) return null

  try {
    const res = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: SPOTIFY_REFRESH_TOKEN,
      }),
    })

    if (!res.ok) {
      console.error('[spotify] Token refresh failed:', res.status, await res.text())
      accessToken = null
      return null
    }

    const data = await res.json()
    accessToken  = data.access_token
    tokenExpires = Date.now() + data.expires_in * 1000
    return accessToken
  } catch (err) {
    console.error('[spotify] Token refresh error:', err.message)
    accessToken = null
    return null
  }
}

// ── Fetch now playing (shared by poll + REST endpoint) ──

async function fetchNowPlaying() {
  const configured = !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET)
  if (!configured || !SPOTIFY_REFRESH_TOKEN) {
    return { ok: true, playing: false, reason: 'not_configured' }
  }

  const token = await getAccessToken()
  if (!token) return { ok: true, playing: false, reason: 'token_error' }

  try {
    const spotRes = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { 'Authorization': `Bearer ${token}` },
    })

    if (spotRes.status === 204 || spotRes.status === 202) {
      return { ok: true, playing: false }
    }

    if (!spotRes.ok) {
      console.error('[spotify] Now playing error:', spotRes.status)
      return { ok: true, playing: false, reason: 'api_error' }
    }

    const data = await spotRes.json()

    if (!data.item) {
      return { ok: true, playing: false }
    }

    const track = data.item
    return {
      ok: true,
      playing: data.is_playing,
      paused:  !data.is_playing,
      track: {
        name:        track.name,
        artist:      track.artists.map(a => a.name).join(', '),
        album:       track.album.name,
        albumArt:    track.album.images?.[1]?.url || track.album.images?.[0]?.url || null,
        url:         track.external_urls?.spotify || null,
        duration_ms: track.duration_ms,
        progress_ms: data.progress_ms,
      },
    }
  } catch (err) {
    console.error('[spotify] Now playing error:', err.message)
    return { ok: true, playing: false, reason: 'fetch_error' }
  }
}

// ── SSE broadcast ──

function broadcast(data) {
  const msg = `data: ${JSON.stringify(data)}\n\n`
  for (const client of sseClients) {
    client.write(msg)
  }
}

async function pollSpotify() {
  const state = await fetchNowPlaying()
  const changed = JSON.stringify(state) !== JSON.stringify(cachedState)
  cachedState = state
  if (changed) broadcast(state)
}

function startPolling() {
  if (pollInterval) return
  pollSpotify()
  pollInterval = setInterval(pollSpotify, 10_000)
}

function stopPollingIfEmpty() {
  if (sseClients.size === 0 && pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// ── Route registration ──

export function registerSpotifyRoutes(app, { FRONTEND, requireAuth }) {
  const configured = !!(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET)

  // ── GET /api/spotify/now-playing — public (REST fallback) ──
  app.get('/api/spotify/now-playing', async (_req, res) => {
    // Return cached state if fresh, otherwise fetch
    if (pollInterval) {
      return res.json(cachedState)
    }
    const state = await fetchNowPlaying()
    cachedState = state
    res.json(state)
  })

  // ── GET /api/spotify/stream — SSE endpoint ──
  app.get('/api/spotify/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',  // disable nginx buffering for SSE
    })

    // Send current state immediately
    res.write(`data: ${JSON.stringify(cachedState)}\n\n`)

    sseClients.add(res)
    startPolling()

    // Heartbeat every 30s to keep connection alive
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 30_000)

    req.on('close', () => {
      clearInterval(heartbeat)
      sseClients.delete(res)
      stopPollingIfEmpty()
    })
  })

  // ── GET /api/spotify/top-tracks — public ──
  app.get('/api/spotify/top-tracks', async (req, res) => {
    if (!configured || !SPOTIFY_REFRESH_TOKEN) {
      return res.json({ ok: true, tracks: [], reason: 'not_configured' })
    }

    const range = ['short_term', 'medium_term', 'long_term'].includes(req.query.range)
      ? req.query.range
      : 'short_term'
    const limit = Math.min(parseInt(req.query.limit) || 10, 50)

    const token = await getAccessToken()
    if (!token) return res.json({ ok: true, tracks: [], reason: 'token_error' })

    try {
      const spotRes = await fetch(
        `https://api.spotify.com/v1/me/top/tracks?time_range=${range}&limit=${limit}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      )

      if (!spotRes.ok) {
        return res.json({ ok: true, tracks: [], reason: 'api_error' })
      }

      const data = await spotRes.json()
      const tracks = (data.items || []).map(t => ({
        name:     t.name,
        artist:   t.artists.map(a => a.name).join(', '),
        album:    t.album.name,
        albumArt: t.album.images?.[1]?.url || t.album.images?.[0]?.url || null,
        url:      t.external_urls?.spotify || null,
      }))

      res.json({ ok: true, tracks })
    } catch (err) {
      console.error('[spotify] Top tracks error:', err.message)
      res.json({ ok: true, tracks: [], reason: 'fetch_error' })
    }
  })

  // ── GET /api/spotify/auth — admin-only, one-time setup ──
  // Visit this URL to start the Spotify OAuth flow and get a refresh token.
  app.get('/api/spotify/auth', requireAuth, (req, res) => {
    const user = req.session?.user
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin only' })
    }

    if (!configured) {
      return res.status(500).json({ error: 'SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET not set in .env' })
    }

    const state = crypto.randomBytes(16).toString('hex')
    oauthStates.set(state, Date.now() + 10 * 60 * 1000)

    const params = new URLSearchParams({
      client_id:     SPOTIFY_CLIENT_ID,
      response_type: 'code',
      redirect_uri:  `${FRONTEND}/api/spotify/callback`,
      scope:         'user-read-currently-playing user-read-playback-state user-top-read',
      state,
    })

    res.redirect(`https://accounts.spotify.com/authorize?${params}`)
  })

  // ── GET /api/spotify/callback — OAuth callback ──
  app.get('/api/spotify/callback', async (req, res) => {
    const { code, state, error } = req.query

    if (error) {
      return res.status(400).json({ error: `Spotify denied: ${error}` })
    }

    // Validate state
    const expires = oauthStates.get(state)
    if (!expires || Date.now() > expires) {
      return res.status(400).json({ error: 'Invalid or expired state' })
    }
    oauthStates.delete(state)

    try {
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64'),
        },
        body: new URLSearchParams({
          grant_type:   'authorization_code',
          code,
          redirect_uri: `${FRONTEND}/api/spotify/callback`,
        }),
      })

      if (!tokenRes.ok) {
        const errText = await tokenRes.text()
        console.error('[spotify] Token exchange failed:', errText)
        return res.status(500).json({ error: 'Token exchange failed' })
      }

      const data = await tokenRes.json()

      // Cache the access token immediately
      accessToken  = data.access_token
      tokenExpires = Date.now() + data.expires_in * 1000

      // The refresh token is what we need to persist
      const refreshToken = data.refresh_token

      // Try to append to .env automatically
      let envWritten = false
      try {
        const envPath = path.resolve('./server/.env')
        // Fallback: check if we're already in server/
        const altEnvPath = path.resolve('./.env')
        const actualPath = fs.existsSync(envPath) ? envPath : fs.existsSync(altEnvPath) ? altEnvPath : null

        if (actualPath) {
          let envContent = fs.readFileSync(actualPath, 'utf8')
          if (envContent.includes('SPOTIFY_REFRESH_TOKEN=')) {
            envContent = envContent.replace(/SPOTIFY_REFRESH_TOKEN=.*/, `SPOTIFY_REFRESH_TOKEN=${refreshToken}`)
          } else {
            envContent += `\n# Spotify refresh token (auto-written by /api/spotify/callback)\nSPOTIFY_REFRESH_TOKEN=${refreshToken}\n`
          }
          fs.writeFileSync(actualPath, envContent)
          envWritten = true
        }
      } catch (err) {
        console.error('[spotify] Could not write refresh token to .env:', err.message)
      }

      res.json({
        ok: true,
        message: envWritten
          ? 'Spotify connected! Refresh token saved to .env. Restart the server to pick it up, or it will work until the current access token expires (~1 hour).'
          : 'Spotify connected! Copy this refresh token to your .env as SPOTIFY_REFRESH_TOKEN and restart.',
        refresh_token: refreshToken,
        env_written: envWritten,
      })
    } catch (err) {
      console.error('[spotify] Callback error:', err.message)
      res.status(500).json({ error: 'Spotify callback failed' })
    }
  })

  // ── GET /api/spotify/status — check if Spotify is configured ──
  app.get('/api/spotify/status', (_req, res) => {
    res.json({
      ok: true,
      configured,
      hasRefreshToken: !!SPOTIFY_REFRESH_TOKEN,
      hasAccessToken:  !!accessToken,
    })
  })

  if (configured && SPOTIFY_REFRESH_TOKEN) {
    console.log('🎵 Spotify integration: configured')
  } else if (configured) {
    console.log('🎵 Spotify integration: client configured, needs refresh token (visit /api/spotify/auth as admin)')
  } else {
    console.log('🎵 Spotify integration: not configured (set SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET)')
  }
}
