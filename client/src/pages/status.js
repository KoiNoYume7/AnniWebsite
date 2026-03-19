export async function renderStatus(root) {
  // ── Real session check via backend ──
  let user = null
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      user = data.user
    }
  } catch (_) {}

  if (!user) {
    root.innerHTML = `
      <section style="min-height:70vh;display:flex;align-items:center;justify-content:center;padding:60px 20px;text-align:center">
        <div>
          <div style="font-size:2.5rem;margin-bottom:16px">🔒</div>
          <h2 style="font-family:var(--font-head);font-size:1.6rem;font-weight:800;margin-bottom:10px">Access Restricted</h2>
          <p style="color:var(--muted);margin-bottom:28px">Sign in to view the system dashboard.</p>
          <button class="btn btn-primary" onclick="navigate('login')">Sign In →</button>
        </div>
      </section>`
    return
  }

  if (user.role !== 'admin') {
    root.innerHTML = `
      <section style="min-height:70vh;display:flex;align-items:center;justify-content:center;padding:60px 20px;text-align:center">
        <div>
          <div style="font-size:2.5rem;margin-bottom:16px">🛡️</div>
          <h2 style="font-family:var(--font-head);font-size:1.6rem;font-weight:800;margin-bottom:10px">Admins only</h2>
          <p style="color:var(--muted);margin-bottom:28px">Pi telemetry lives in this legacy dashboard. Head to the organizer for everything else.</p>
          <button class="btn btn-primary" onclick="navigate('organizer')">Open organizer →</button>
        </div>
      </section>`
    return
  }

  const u = user

  root.innerHTML = `
    <section style="padding:40px 0 64px">
      <div class="wrap">
        <!-- Header row -->
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:32px">
          <div>
            <h1 style="font-family:var(--font-head);font-size:1.6rem;font-weight:800;letter-spacing:-0.025em">
              System Status
            </h1>
            <p style="color:var(--muted);font-size:0.85rem;margin-top:4px">
              rpi4 · Signed in as ${u.name} via ${u.provider} ·
              <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:inherit;font-family:inherit;padding:0" onclick="doLogout()">Sign out</button>
            </p>
          </div>
          <div style="display:flex;align-items:center;gap:14px">
            <div class="uptime-badge"><div style="width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse 2s infinite"></div>All systems online</div>
            <span style="font-family:var(--font-mono);font-size:0.78rem;color:var(--muted)" id="status-clock">--:--:--</span>
          </div>
        </div>

        <p style="font-size:0.72rem;color:var(--muted);text-align:right;margin-bottom:16px">
          Auto-refreshes every <span style="color:var(--accent)">30s</span> · Last: <span id="lastUpdate">just now</span>
        </p>

        <!-- Quick stats row -->
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px">
          ${[
            { id:'uptime',  label:'Uptime',    sub:'since last boot' },
            { id:'cputemp', label:'CPU Temp',  sub:'vcgencmd' },
            { id:'cpuload', label:'Load Avg',  sub:'1-min average' },
            { id:'memused', label:'Memory',    sub:'used / total' },
          ].map(s => `
            <div class="card" style="padding:22px 24px">
              <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">${s.label}</div>
              <div style="font-family:var(--font-head);font-size:1.7rem;font-weight:800;letter-spacing:-0.03em;line-height:1" id="${s.id}">—</div>
              <div style="font-size:0.75rem;color:var(--muted);margin-top:6px">${s.sub}</div>
            </div>
          `).join('')}
        </div>

        <!-- CPU + Memory bars -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">
          <div class="card">
            <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:18px">CPU Cores</div>
            ${[0,1,2,3].map(i => `
              <div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:5px">
                  <span>Core ${i}</span><span id="cpu${i}pct" style="font-family:var(--font-mono);color:var(--muted)">—</span>
                </div>
                <div class="prog-track"><div class="prog-fill prog-blue" id="cpu${i}bar" style="width:0%"></div></div>
              </div>`).join('')}
          </div>
          <div class="card">
            <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:18px">Memory Breakdown</div>
            ${[
              { id:'membar',   cls:'prog-blue',   label:'Used',          pctId:'mem_pct' },
              { id:'cachebar', cls:'prog-blue',   label:'Buffers/Cache', pctId:'cache_pct' },
              { id:'swapbar',  cls:'prog-yellow', label:'Swap',          pctId:'swap_pct' },
            ].map(b => `
              <div style="margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;font-size:0.78rem;margin-bottom:5px">
                  <span>${b.label}</span><span id="${b.pctId}" style="font-family:var(--font-mono);color:var(--muted)">—</span>
                </div>
                <div class="prog-track"><div class="prog-fill ${b.cls}" id="${b.id}" style="width:0%"></div></div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Storage -->
        <div class="card" style="margin-bottom:18px">
          <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:18px">Storage</div>
          <div id="storage-bars">
            ${[
              { id:'sd',  label:'/ · System SD',               used:'12.4 GB', total:'59 GB',  pct:21 },
              { id:'d1',  label:'/srv/storage · External Drive 1', used:'312 GB', total:'931 GB', pct:33 },
              { id:'d2',  label:'/srv/backup · External Drive 2',  used:'88 GB',  total:'931 GB', pct:9  },
            ].map(d => `
              <div style="margin-bottom:16px">
                <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:6px">
                  <span style="font-weight:500">${d.label}</span>
                  <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--muted)">${d.used} / ${d.total}</span>
                </div>
                <div class="prog-track">
                  <div class="prog-fill ${d.pct > 85 ? 'prog-red' : d.pct > 65 ? 'prog-yellow' : 'prog-blue'}"
                       style="width:${d.pct}%"></div>
                </div>
              </div>`).join('')}
          </div>
        </div>

        <!-- Services + Network -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">
          <div class="card">
            <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Services</div>
            <div style="display:flex;flex-direction:column;gap:9px">
              ${[
                { name:'nginx',       port:':80/:443',    status:'up' },
                { name:'tailscaled',  port:'VPN mesh',    status:'up' },
                { name:'smbd',        port:':445',        status:'up' },
                { name:'cloudflared', port:'tunnel',      status:'up' },
                { name:'fail2ban',    port:'SSH guard',   status:'up' },
              ].map(s => `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:9px;background:rgba(255,255,255,0.02);border:1px solid var(--border)">
                  <div style="display:flex;align-items:center;gap:10px">
                    <div style="width:7px;height:7px;border-radius:50%;background:var(--green);animation:pulse 2s infinite"></div>
                    <div>
                      <div style="font-size:0.88rem;font-weight:500">${s.name}</div>
                      <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted)">${s.port}</div>
                    </div>
                  </div>
                  <span class="badge-up">Up</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="card">
            <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:16px">Network & Security</div>
            <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px">
              ${[
                { id:'netRx',    label:'↓ Download' },
                { id:'netTx',    label:'↑ Upload' },
                { id:'netTotal', label:'Total today' },
              ].map(n => `
                <div style="text-align:center;padding:14px 8px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid var(--border)">
                  <div style="font-family:var(--font-head);font-size:1rem;font-weight:700;color:var(--accent)" id="${n.id}">—</div>
                  <div style="font-size:0.7rem;color:var(--muted);margin-top:3px">${n.label}</div>
                </div>
              `).join('')}
            </div>
            <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">Fail2ban</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div style="text-align:center;padding:14px 8px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid var(--border)">
                <div style="font-family:var(--font-head);font-size:1.2rem;font-weight:700;color:var(--yellow)" id="f2bBanned">—</div>
                <div style="font-size:0.7rem;color:var(--muted);margin-top:3px">Banned now</div>
              </div>
              <div style="text-align:center;padding:14px 8px;border-radius:10px;background:rgba(255,255,255,0.02);border:1px solid var(--border)">
                <div style="font-family:var(--font-head);font-size:1.2rem;font-weight:700;color:var(--muted)" id="f2bTotal">—</div>
                <div style="font-size:0.7rem;color:var(--muted);margin-top:3px">Total today</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Event log -->
        <div class="card" style="margin-bottom:18px">
          <div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);margin-bottom:14px">
            Recent Events
          </div>
          <div id="eventLog" style="font-family:var(--font-mono);font-size:0.76rem;line-height:2;color:var(--muted);max-height:180px;overflow-y:auto">
            Loading…
          </div>
        </div>
      </div>
    </section>
  `

  // Clock
  setInterval(() => {
    const el = document.getElementById('status-clock')
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB')
  }, 1000)

  // Logout
  window.doLogout = async () => {
    try { await fetch('/api/auth/logout', { credentials: 'include' }) } catch (_) {}
    const navBtn = document.getElementById('navLoginBtn')
    if (navBtn) { navBtn.textContent = 'Login'; navBtn.onclick = () => navigate('login') }
    import('../main.js').then(m => m.showToast('👋 Signed out'))
    navigate('')
  }

  function set(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html }
  function setText(id, v) { const el = document.getElementById(id); if (el) el.textContent = v }
  function setWidth(id, pct) { const el = document.getElementById(id); if (el) el.style.width = pct + '%' }

  async function updateStats() {
    let d
    try {
      const res = await fetch('/api/stats', { credentials: 'include' })
      if (!res.ok) throw new Error('stats unavailable')
      d = await res.json()
    } catch {
      set('uptime', `<span style="color:var(--muted)">unavailable</span>`)
      return
    }

    // ── Uptime ──
    set('uptime', `<span style="color:var(--green)">${d.uptime.human}</span>`)

    // ── CPU Temp ──
    const temp = d.cpu_temp.celsius
    const tempColor = d.cpu_temp.status === 'hot' ? 'var(--red)' : d.cpu_temp.status === 'warm' ? 'var(--yellow)' : 'var(--accent)'
    set('cputemp', temp != null
      ? `<span style="color:${tempColor}">${temp}°C</span>`
      : `<span style="color:var(--muted)">N/A</span>`)

    // ── Load ──
    const load = d.cpu_load.load1
    set('cpuload', `<span style="color:${load > 2.5 ? 'var(--red)' : 'var(--text)'}">${load.toFixed(2)}</span>`)

    // ── Memory summary ──
    set('memused', `<span style="color:var(--accent2)">${d.memory.used_gb} GB / ${d.memory.total_gb} GB</span>`)

    // ── CPU cores ──
    const cores = Object.entries(d.cpu_usage).filter(([k]) => k !== 'cpu')
    cores.forEach(([, pct], i) => {
      setText(`cpu${i}pct`, pct + '%')
      setWidth(`cpu${i}bar`, pct)
    })

    // ── Memory bars ──
    setWidth('membar',   d.memory.used_pct);   setText('mem_pct',   d.memory.used_pct + '%')
    setWidth('cachebar', d.memory.cached_pct); setText('cache_pct', d.memory.cached_pct + '%')
    setWidth('swapbar',  d.memory.swap_pct);   setText('swap_pct',  d.memory.swap_pct + '%')

    // ── Storage ──
    const storageEl = document.getElementById('storage-bars')
    if (storageEl) {
      storageEl.innerHTML = d.storage.map(s => s.error ? `
        <div style="margin-bottom:16px">
          <div style="font-size:0.82rem;color:var(--muted)">${s.label} — unavailable</div>
        </div>` : `
        <div style="margin-bottom:16px">
          <div style="display:flex;justify-content:space-between;font-size:0.82rem;margin-bottom:6px">
            <span style="font-weight:500">${s.label}</span>
            <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--muted)">${s.used_gb} GB / ${s.total_gb} GB</span>
          </div>
          <div class="prog-track">
            <div class="prog-fill ${s.used_pct > 85 ? 'prog-red' : s.used_pct > 65 ? 'prog-yellow' : 'prog-blue'}"
                 style="width:${s.used_pct}%"></div>
          </div>
        </div>`).join('')
    }

    // ── Network ──
    setText('netRx',    d.network.rx_rate)
    setText('netTx',    d.network.tx_rate)
    setText('netTotal', d.network.rx_total)

    // ── Fail2ban ──
    setText('f2bBanned', d.fail2ban.currently_banned)
    setText('f2bTotal',  d.fail2ban.total_banned)

    // ── Services ──
    // re-render service list with live status
    const svcContainer = document.querySelector('.card .uptime-badge')?.closest('.card')
    const svcList = document.querySelector('[id^="svc-"]')?.parentElement
    if (d.services) {
      const svcParent = document.querySelector('.badge-up')?.closest('[style*="flex-direction:column"]')
      if (svcParent) {
        svcParent.innerHTML = d.services.map(s => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:9px;background:rgba(255,255,255,0.02);border:1px solid var(--border)">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:7px;height:7px;border-radius:50%;background:${s.up ? 'var(--green)' : 'var(--red)'};${s.up ? 'animation:pulse 2s infinite' : ''}"></div>
              <div>
                <div style="font-size:0.88rem;font-weight:500">${s.name}</div>
                <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--muted)">${s.port}</div>
              </div>
            </div>
            <span class="${s.up ? 'badge-up' : 'badge-down'}">${s.up ? 'Up' : 'Down'}</span>
          </div>`).join('')
      }
    }

    // ── Logs ──
    const sourceColors = { nginx: '#4ade80', 'anni-website': '#4fa8d8', 'anni-stats': '#a78bfa' }
    const logEl = document.getElementById('eventLog')
    if (logEl && d.logs.length) {
      logEl.innerHTML = d.logs.map(l => `
        <div style="display:flex;gap:14px">
          <span style="color:var(--accent);flex-shrink:0">${l.source}</span>
          <span style="color:${sourceColors[l.source] || 'var(--muted)'};">${l.message}</span>
        </div>`).join('')
    }

    // ── Last updated ──
    const lu = document.getElementById('lastUpdate')
    if (lu) lu.textContent = new Date().toLocaleTimeString('en-GB')
  }

  updateStats()
  const interval = setInterval(() => {
    if (!document.getElementById('status-clock')) { clearInterval(interval); return }
    updateStats()
  }, 30000)
}