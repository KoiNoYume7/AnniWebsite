# ─────────────────────────────────────────────────────────
#  deploy.ps1 — AnniWebsite deploy script (Windows)
#  Run from repo root: .\deploy.ps1
#  Builds the frontend, copies everything to the Pi,
#  and restarts the backend service automatically.
#
#  Pi layout (SD card — always available):
#    /opt/anni/www      → built frontend
#    /opt/anni/server   → Node/Express backend + sessions.db
#
#  The organizer DB lives on the storage drive at
#  /srv/storage/AnniWebsite/server/db/organizer.db and is
#  symlinked into /opt/anni/server/db/organizer.db. Deploy
#  scripts never touch that file.
# ─────────────────────────────────────────────────────────

param(
    [switch]$ClientOnly,
    [switch]$ServerOnly,
    [switch]$SkipBuild,
    [switch]$ScOnly,
    [switch]$SkipSc,
    [switch]$Help
)

# ── Config ──
$PI_USER   = "akira"
$PI_HOST   = "yme-04"
$PI_WEB    = "/opt/anni/www"
$PI_SERVER = "/opt/anni/server"
$SC_SRC    = "C:\Users\akira\CascadeProjects\CZTimers\src"   # path to CZTimers/src on this machine
$SC_WEB    = "/opt/anni/sc"

# ── Colours ──
function Log   { param($m) Write-Host "> $m" -ForegroundColor Cyan }
function Ok    { param($m) Write-Host "OK  $m" -ForegroundColor Green }
function Warn  { param($m) Write-Host "WARN $m" -ForegroundColor Yellow }
function Fail  { param($m) Write-Host "FAIL $m" -ForegroundColor Red; exit 1 }

function Invoke-SSH { param($cmd) ssh "${PI_USER}@${PI_HOST}" $cmd }
function Invoke-SCP { param($src, $dst) scp -r $src "${PI_USER}@${PI_HOST}:${dst}" }

if ($Help) {
    Write-Host "Usage: .\deploy.ps1 [options]"
    Write-Host "  -ClientOnly   Only deploy frontend"
    Write-Host "  -ServerOnly   Only deploy backend + restart service"
    Write-Host "  -SkipBuild    Skip npm build step"
    Write-Host "  -ScOnly       Only deploy CZTimers (sc.yumehana.dev)"
    Write-Host "  -SkipSc       Skip CZTimers deploy"
    exit 0
}

$DeployClient = -not $ServerOnly -and -not $ScOnly
$DeployServer = -not $ClientOnly -and -not $ScOnly
$DeploySc     = -not $SkipSc

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) { Fail "ssh not found in PATH" }
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) { Fail "scp not found in PATH" }
if ($DeployClient -and -not $SkipBuild -and -not (Get-Command npm -ErrorAction SilentlyContinue)) { Fail "npm not found in PATH" }

if (Get-Command ssh-add -ErrorAction SilentlyContinue) {
    $svc = $null
    try { $svc = Get-Service ssh-agent -ErrorAction SilentlyContinue } catch {}
    if ($null -ne $svc -and $svc.Status -ne 'Running') {
        try { Start-Service ssh-agent -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Milliseconds 200
        try { $svc = Get-Service ssh-agent -ErrorAction SilentlyContinue } catch {}
    }

    $list = $null
    if ($null -ne $svc -and $svc.Status -eq 'Running') {
        try { $list = ssh-add -L 2>$null } catch {}
    }

    if ($LASTEXITCODE -eq 0 -and ($null -ne $svc -and $svc.Status -eq 'Running')) {
        $hasKey = ($null -ne $list -and ($list | Out-String).Trim().Length -gt 0)
        if (-not $hasKey) {
            $defaultKey = Join-Path $env:USERPROFILE '.ssh\id_ed25519'
            if (Test-Path $defaultKey) {
                ssh-add $defaultKey
            }
        }
    }
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "      AnniWebsite Deploy Script     " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# ── Check SSH reachability ──
Log "Checking connection to ${PI_USER}@${PI_HOST}..."
ssh -o BatchMode=yes -o ConnectTimeout=5 -q "${PI_USER}@${PI_HOST}" "exit"
if ($LASTEXITCODE -ne 0) {
    ssh -o ConnectTimeout=5 "${PI_USER}@${PI_HOST}" "exit"
    if ($LASTEXITCODE -ne 0) {
        Fail "SSH check failed. Check Tailscale/network, host name, and SSH auth (key/passphrase)."
    }
}
Ok "Connected to ${PI_HOST}"

# ── Build frontend ──
if ($DeployClient -and -not $SkipBuild) {
    Log "Building frontend..."
    Push-Location client
    npm run build 2>&1 | Select-Object -Last 5
    if ($LASTEXITCODE -ne 0) { Pop-Location; Fail "Frontend build failed" }
    Pop-Location
    Ok "Frontend built -> client/dist/"
}

# ── Deploy frontend ──
if ($DeployClient) {
    Log "Deploying frontend to ${PI_HOST}:${PI_WEB}..."
    # Clear old built artifacts before pushing fresh ones (no user data here)
    Invoke-SSH "rm -rf ${PI_WEB}/assets ${PI_WEB}/index.html ${PI_WEB}/favicon.svg"
    Invoke-SCP "client/dist/*" $PI_WEB
    if ($LASTEXITCODE -ne 0) { Fail "Frontend deploy failed" }
    Ok "Frontend deployed"
}

# ── Deploy backend ──
if ($DeployServer) {
    Log "Deploying backend to ${PI_HOST}:${PI_SERVER}..."
    # Copy server files, skip node_modules, .env, and db/ (preserves organizer.db symlink + sessions.db)
    $serverFiles = Get-ChildItem server | Where-Object {
        $_.Name -notin @('node_modules', '.env', 'db')
    }
    foreach ($f in $serverFiles) {
        Invoke-SCP $f.FullName $PI_SERVER
    }
    if ($LASTEXITCODE -ne 0) { Fail "Backend deploy failed" }

    # Sync only schema.sql + db.js from db/ — never touch the .db files on the Pi
    Invoke-SCP "server\db\db.js" "${PI_SERVER}/db/"
    Invoke-SCP "server\db\schema.sql" "${PI_SERVER}/db/"
    Ok "Backend files synced (.env, organizer.db, sessions.db preserved)"

    Log "Installing backend dependencies on Pi..."
    Invoke-SSH "cd ${PI_SERVER} && npm install --omit=dev 2>&1 | tail -3"
    Ok "Dependencies installed"

    Log "Restarting anni-website service..."
    Invoke-SSH "sudo systemctl restart anni-website"
    Start-Sleep 2

    $status = (Invoke-SSH "systemctl is-active anni-website" | Out-String).Trim()
    if ($status -eq "active") {
        Ok "anni-website service is running"
    } else {
        Fail "Service failed to start - run: journalctl -u anni-website -n 20"
    }
}

# ── Deploy CZTimers (sc.yumehana.dev) ──
if ($DeploySc) {
    if (Test-Path $SC_SRC) {
        Log "Deploying CZTimers to ${PI_HOST}:${SC_WEB}..."
        Invoke-SSH "mkdir -p ${SC_WEB}"
        # rsync not always available on Windows; fall back to scp
        if (Get-Command rsync -ErrorAction SilentlyContinue) {
            rsync -az --delete --exclude='.DS_Store' `
                "${SC_SRC}/" `
                "${PI_USER}@${PI_HOST}:${SC_WEB}/"
        } else {
            $scFiles = Get-ChildItem $SC_SRC
            foreach ($f in $scFiles) {
                Invoke-SCP $f.FullName $SC_WEB
            }
        }
        if ($LASTEXITCODE -ne 0) { Fail "CZTimers deploy failed" }
        Ok "CZTimers deployed → sc.yumehana.dev"
    } else {
        Warn "CZTimers source not found at: ${SC_SRC} — skipping"
    }
}

# ── Done ──
Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "           Deploy complete!         " -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  https://yumehana.dev" -ForegroundColor Cyan
Write-Host "  https://sc.yumehana.dev" -ForegroundColor Cyan
Write-Host ""
