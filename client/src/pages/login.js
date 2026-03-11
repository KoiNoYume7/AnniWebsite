export async function renderLogin(root) {
  // ── Check for error params from OAuth callback ──
  const hash   = location.hash
  const search = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(search)
  const error  = params.get('error')

  // ── Check if already logged in via session ──
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (res.ok) {
      const { user } = await res.json()
      renderLoggedIn(root, user)
      return
    }
  } catch (_) { /* backend not reachable, show login */ }

  const errorMessages = {
    not_authorized: '⛔ Your account isn\'t on the access list.',
    invalid_state:  '⚠️ Login session expired. Please try again.',
    token_failed:   '❌ OAuth token exchange failed. Try again.',
    session_error:  '❌ Couldn\'t save your session. Try again.',
    server_error:   '❌ Something went wrong on the server.',
  }

  root.innerHTML = `
    <section style="min-height:80vh;display:flex;align-items:center;justify-content:center;padding:60px 20px">
      <div style="width:100%;max-width:420px">
        <div class="card reveal" style="padding:44px">
          <div style="text-align:center;margin-bottom:32px">
            <div style="font-size:2.4rem;margin-bottom:14px">🔐</div>
            <h1 style="font-family:var(--font-head);font-size:1.6rem;font-weight:800;letter-spacing:-0.025em;margin-bottom:8px">
              Dev Login
            </h1>
            <p style="color:var(--muted);font-size:0.88rem;line-height:1.6">
              Access the status dashboard and private tools.<br>
              Whitelisted accounts only.
            </p>
          </div>

          ${error ? `
            <div style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:10px;padding:12px 16px;margin-bottom:20px;font-size:0.85rem;color:var(--red);text-align:center">
              ${errorMessages[error] || '❌ Login failed. Please try again.'}
            </div>
          ` : ''}

          <div id="oauth-buttons">
            <a class="oauth-btn oauth-github" href="/api/auth/github">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.749 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
              </svg>
              Continue with GitHub
            </a>

            <a class="oauth-btn oauth-discord" href="/api/auth/discord">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
              </svg>
              Continue with Discord
            </a>

            <a class="oauth-btn oauth-google" href="/api/auth/google">
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </a>
          </div>

          <div style="margin-top:24px;padding-top:20px;border-top:1px solid var(--border);text-align:center">
            <p style="font-size:0.74rem;color:var(--muted);line-height:1.6">
              Only whitelisted accounts are granted access.<br>
              All login attempts are logged server-side.
            </p>
          </div>
        </div>

        <p style="text-align:center;margin-top:20px;font-size:0.8rem;color:var(--muted)">
          Not a developer?
          <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:inherit;font-family:inherit"
                  onclick="navigate('')">Go back home →</button>
        </p>
      </div>
    </section>
  `
}

function renderLoggedIn(root, user) {
  root.innerHTML = `
    <section style="min-height:60vh;display:flex;align-items:center;justify-content:center;padding:60px 20px">
      <div style="width:100%;max-width:420px">
        <div class="card reveal" style="padding:44px;text-align:center">
          ${user.avatar
            ? `<img src="${user.avatar}" alt="" style="width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:block;border:2px solid var(--border-h)">`
            : `<div style="font-size:2.4rem;margin-bottom:14px">✅</div>`
          }
          <h2 style="font-family:var(--font-head);font-size:1.4rem;font-weight:800;margin-bottom:6px">
            Welcome back, ${user.name}
          </h2>
          <p style="color:var(--muted);font-size:0.85rem;margin-bottom:28px">
            Authenticated via ${user.provider}
          </p>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button class="btn btn-primary" onclick="navigate('status')" style="justify-content:center">
              Open Status Dashboard →
            </button>
            <button class="btn btn-ghost" onclick="doLogout()" style="justify-content:center">
              Sign out
            </button>
          </div>
        </div>
      </div>
    </section>
  `

  window.doLogout = async () => {
    try {
      await fetch('/api/auth/logout', { credentials: 'include' })
    } catch (_) {}
    // update nav button
    const navBtn = document.getElementById('navLoginBtn')
    if (navBtn) { navBtn.textContent = 'Login'; navBtn.onclick = () => navigate('login') }
    import('../main.js').then(m => m.showToast('👋 Signed out'))
    navigate('')
  }
}
