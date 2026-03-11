#!/bin/bash
# ─────────────────────────────────────────────────────────
#  deploy.sh — AnniWebsite deploy script
#  Run from your dev machine: ./deploy.sh
#  Builds the frontend, copies everything to the Pi,
#  and restarts the backend service automatically.
# ─────────────────────────────────────────────────────────

set -e  # exit on any error

# ── Config — change these if needed ──
PI_USER="akira"
PI_HOST="yme-04"
PI_WEB="/srv/storage/AnniWebsite"
PI_SERVER="/srv/storage/AnniWebsite/server"

# ── Colours ──
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${CYAN}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✔ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
fail() { echo -e "${RED}✘ $1${NC}"; exit 1; }

echo ""
echo -e "${CYAN}╔══════════════════════════════════╗${NC}"
echo -e "${CYAN}║     AnniWebsite Deploy Script    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════╝${NC}"
echo ""

# ── Parse flags ──
DEPLOY_CLIENT=true
DEPLOY_SERVER=true
SKIP_BUILD=false

for arg in "$@"; do
  case $arg in
    --client-only) DEPLOY_SERVER=false ;;
    --server-only) DEPLOY_CLIENT=false; SKIP_BUILD=true ;;
    --skip-build)  SKIP_BUILD=true ;;
    --help)
      echo "Usage: ./deploy.sh [options]"
      echo "  --client-only   Only deploy frontend"
      echo "  --server-only   Only deploy backend + restart service"
      echo "  --skip-build    Skip npm build step"
      exit 0
      ;;
  esac
done

# ── Check SSH reachability ──
log "Checking connection to ${PI_USER}@${PI_HOST}..."
ssh -o ConnectTimeout=5 -q "${PI_USER}@${PI_HOST}" exit || \
  fail "Cannot reach ${PI_HOST}. Are you on Tailscale?"
ok "Connected to ${PI_HOST}"

# ── Build frontend ──
if $DEPLOY_CLIENT && ! $SKIP_BUILD; then
  log "Building frontend..."
  cd client
  npm run build 2>&1 | tail -5
  cd ..
  ok "Frontend built → client/dist/"
fi

# ── Deploy frontend ──
if $DEPLOY_CLIENT; then
  log "Deploying frontend to ${PI_HOST}:${PI_WEB}..."
  rsync -az --delete \
    --exclude='.DS_Store' \
    client/dist/ \
    "${PI_USER}@${PI_HOST}:${PI_WEB}/"
  ok "Frontend deployed"
fi

# ── Deploy backend ──
if $DEPLOY_SERVER; then
  log "Deploying backend to ${PI_HOST}:${PI_SERVER}..."
  rsync -az \
    --exclude='.DS_Store' \
    --exclude='node_modules/' \
    --exclude='.env' \
    server/ \
    "${PI_USER}@${PI_HOST}:${PI_SERVER}/"
  ok "Backend files synced (.env preserved)"

  log "Installing backend dependencies on Pi..."
  ssh "${PI_USER}@${PI_HOST}" "cd ${PI_SERVER} && npm install --omit=dev 2>&1 | tail -3"
  ok "Dependencies installed"

  log "Restarting anni-website service..."
  ssh "${PI_USER}@${PI_HOST}" "sudo systemctl restart anni-website"
  sleep 2

  # Check it came back up
  STATUS=$(ssh "${PI_USER}@${PI_HOST}" "systemctl is-active anni-website")
  if [ "$STATUS" = "active" ]; then
    ok "anni-website service is running"
  else
    fail "Service failed to start — run: journalctl -u anni-website -n 20"
  fi
fi

# ── Deploy stats API if it exists ──
if ssh "${PI_USER}@${PI_HOST}" "test -f /srv/storage/AnniWebsite/stats/stats.py" 2>/dev/null; then
  log "Deploying stats API..."
  rsync -az \
    --exclude='.DS_Store' \
    stats/ \
    "${PI_USER}@${PI_HOST}:/srv/storage/AnniWebsite/stats/"
  ssh "${PI_USER}@${PI_HOST}" "sudo systemctl restart anni-stats 2>/dev/null || true"
  ok "Stats API deployed"
fi

# ── Done ──
echo ""
echo -e "${GREEN}╔══════════════════════════════════╗${NC}"
echo -e "${GREEN}║         Deploy complete! 🚀      ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════╝${NC}"
echo ""
echo -e "  ${CYAN}https://yumehana.dev${NC}"
echo ""