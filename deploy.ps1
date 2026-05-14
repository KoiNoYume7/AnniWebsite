# ─────────────────────────────────────────────────────────
#  deploy.ps1 — AnniWebsite deploy script (Windows)
#  Run from repo root: .\deploy.ps1
#
#  Pi layout:
#    /opt/anni/website-www   → built frontend
#    /opt/anni/website       → Node/Express backend
#
#  Auth is handled by AnniCore at /opt/anni/core (port 4200).
#  The SC DB lives at /srv/storage/AnniWebsite/sc.db — never touched by deploy.
# ─────────────────────────────────────────────────────────

param(
    [switch]$ClientOnly,
    [switch]$ServerOnly,
    [switch]$SkipBuild,
    [switch]$Help
)

$ErrorActionPreference = "Stop"

Import-Module "$PSScriptRoot\lib\AnniLog.psd1" -Force

# ── Config ──
$PI_USER   = "akira"
$PI_HOST   = "yme-04"
$PI_WEB    = "/opt/anni/website-www"
$PI_SERVER = "/opt/anni/website"
$LogFile   = Join-Path $PSScriptRoot "logs\deploy-$(Get-Date -Format 'yyyy-MM-dd_HHmmss').log"

function Invoke-SSH { param($cmd) ssh "${PI_USER}@${PI_HOST}" $cmd }
function Invoke-SCP { param($src, $dst) scp -r $src "${PI_USER}@${PI_HOST}:${dst}" }

if ($Help) {
    Write-Host "Usage: .\deploy.ps1 [options]"
    Write-Host "  -ClientOnly   Only deploy frontend"
    Write-Host "  -ServerOnly   Only deploy backend + restart service"
    Write-Host "  -SkipBuild    Skip npm build step"
    exit 0
}

$DeployClient = -not $ServerOnly
$DeployServer = -not $ClientOnly

Initialize-AnniLog -LogFilePath $LogFile -LogLevel "INFO" -EnableStopwatch

# ── SSH agent ──
if (Get-Command ssh-add -ErrorAction SilentlyContinue) {
    $svc = $null
    try { $svc = Get-Service ssh-agent -ErrorAction SilentlyContinue } catch {}
    if ($null -ne $svc -and $svc.Status -ne 'Running') {
        try { Start-Service ssh-agent -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Milliseconds 200
        try { $svc = Get-Service ssh-agent -ErrorAction SilentlyContinue } catch {}
    }
    if ($null -ne $svc -and $svc.Status -eq 'Running') {
        $list = $null
        try { $list = ssh-add -L 2>$null } catch {}
        if (-not ($list | Out-String).Trim()) {
            $defaultKey = Join-Path $env:USERPROFILE '.ssh\id_ed25519'
            if (Test-Path $defaultKey) { ssh-add $defaultKey }
        }
    }
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "      AnniWebsite Deploy Script     " -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-AnniLog -Level ERROR -Message "ssh not found in PATH"; Close-AnniLog; exit 1
}
if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    Write-AnniLog -Level ERROR -Message "scp not found in PATH"; Close-AnniLog; exit 1
}
if ($DeployClient -and -not $SkipBuild -and -not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-AnniLog -Level ERROR -Message "npm not found in PATH"; Close-AnniLog; exit 1
}

# ── SSH reachability check ──
Write-AnniLog -Level INFO -Message "Checking connection to ${PI_USER}@${PI_HOST}..."
& ssh -o BatchMode=yes -o ConnectTimeout=5 -q "${PI_USER}@${PI_HOST}" "exit"
if ($LASTEXITCODE -ne 0) {
    & ssh -o ConnectTimeout=5 "${PI_USER}@${PI_HOST}" "exit"
    if ($LASTEXITCODE -ne 0) {
        Write-AnniLog -Level ERROR -Message "SSH check failed. Check Tailscale/network, hostname, and SSH auth."
        Close-AnniLog; exit 1
    }
}
Write-AnniLog -Level SUCCESS -Message "Connected to ${PI_HOST}"

# ── Build frontend ──
if ($DeployClient -and -not $SkipBuild) {
    Write-AnniLog -Level INFO -Message "Compiling content (devlogs, about)..."
    node scripts/compile-all.js
    if ($LASTEXITCODE -ne 0) {
        Write-AnniLog -Level ERROR -Message "Content compile failed"; Close-AnniLog; exit 1
    }
    Write-AnniLog -Level SUCCESS -Message "Content compiled"

    Write-AnniLog -Level INFO -Message "Building frontend..."
    Push-Location client
    npm run build 2>&1 | Select-Object -Last 5
    if ($LASTEXITCODE -ne 0) {
        Pop-Location
        Write-AnniLog -Level ERROR -Message "Frontend build failed"
        Close-AnniLog; exit 1
    }
    Pop-Location
    Write-AnniLog -Level SUCCESS -Message "Frontend built → client/dist/"
}

# ── Deploy frontend ──
if ($DeployClient) {
    Write-AnniLog -Level INFO -Message "Deploying frontend to ${PI_HOST}:${PI_WEB}..."
    Invoke-SSH "rm -rf ${PI_WEB}/assets ${PI_WEB}/index.html ${PI_WEB}/favicon.svg"
    Get-ChildItem "client/dist" | ForEach-Object { Invoke-SCP $_.FullName $PI_WEB }
    if ($LASTEXITCODE -ne 0) {
        Write-AnniLog -Level ERROR -Message "Frontend deploy failed"; Close-AnniLog; exit 1
    }
    Write-AnniLog -Level SUCCESS -Message "Frontend deployed"
}

# ── Deploy backend ──
if ($DeployServer) {
    Write-AnniLog -Level INFO -Message "Deploying backend to ${PI_HOST}:${PI_SERVER}..."
    Invoke-SSH "mkdir -p ${PI_SERVER}/db"
    $serverFiles = Get-ChildItem server | Where-Object { $_.Name -notin @('node_modules', '.env', 'db') }
    foreach ($f in $serverFiles) { Invoke-SCP $f.FullName $PI_SERVER }
    if ($LASTEXITCODE -ne 0) {
        Write-AnniLog -Level ERROR -Message "Backend deploy failed"; Close-AnniLog; exit 1
    }

    Invoke-SCP "server\db\db.js"      "${PI_SERVER}/db/"
    Invoke-SCP "server\db\schema.sql" "${PI_SERVER}/db/"
    Write-AnniLog -Level SUCCESS -Message "Backend files synced (.env and sc.db preserved)"

    Write-AnniLog -Level INFO -Message "Installing backend dependencies on Pi..."
    Invoke-SSH "cd ${PI_SERVER} && npm install --omit=dev 2>&1 | tail -3"
    Write-AnniLog -Level SUCCESS -Message "Dependencies installed"

    Write-AnniLog -Level INFO -Message "Restarting anni-website service..."
    Invoke-SSH "sudo systemctl restart anni-website"
    Start-Sleep 2

    $status = (Invoke-SSH "systemctl is-active anni-website" | Out-String).Trim()
    if ($status -eq "active") {
        Write-AnniLog -Level SUCCESS -Message "anni-website service is running"
    } else {
        Write-AnniLog -Level ERROR -Message "Service failed to start — run: journalctl -u anni-website -n 20"
        Close-AnniLog; exit 1
    }
}

Close-AnniLog

Write-Host ""
Write-Host "====================================" -ForegroundColor Green
Write-Host "           Deploy complete!         " -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green
Write-Host ""
Write-Host "  https://yumehana.dev" -ForegroundColor Cyan
Write-Host ""
