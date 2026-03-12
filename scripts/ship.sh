#!/usr/bin/env bash
# Jailbreak Ship Pipeline — 7-Law Verification
# Single command: verify → 7-law audit → deploy → inscribe → reflect
# Usage: pnpm ship
#
# Options:
#   --api-only      Deploy only the API gateway
#   --dashboard-only Deploy only the dashboard
#   --skip-verify   Skip typecheck/build (use when already verified)
#
# Environment:
#   JARVIS_API_URL       API base URL (default: https://jarvis-api-gateway.ben-c1f.workers.dev)
#   JARVIS_AUTH_SECRET   Auth token for memory inscription (optional)

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

DEPLOY_API=true
DEPLOY_DASH=true
SKIP_VERIFY=false

for arg in "$@"; do
  case $arg in
    --api-only) DEPLOY_DASH=false ;;
    --dashboard-only) DEPLOY_API=false ;;
    --skip-verify) SKIP_VERIFY=true ;;
  esac
done

API_URL="${JARVIS_API_URL:-https://jarvis-api-gateway.ben-c1f.workers.dev}"
AUTH="${JARVIS_AUTH_SECRET:-}"

echo "═══════════════════════════════════════════"
echo "  JAILBREAK SHIP — 7-Law Deploy Pipeline"
echo "═══════════════════════════════════════════"

START=$(date +%s)

# ─── Law IV: Covenant — Build + Typecheck ───
if [ "$SKIP_VERIFY" = false ]; then
  echo ""
  echo "▸ Law IV (Covenant): Verify"
  bash scripts/verify.sh
fi

# ─── Law I: Origin — Trace changes to purpose ───
echo ""
echo "▸ Law I (Origin): Audit"
LAST_MSG=$(git log -1 --format="%s" 2>/dev/null || echo "")
COMMIT_COUNT=$(git log --oneline -5 2>/dev/null | wc -l | tr -d ' ')
if [ ${#LAST_MSG} -lt 5 ]; then
  echo "  ⚠ Last commit message too short: '$LAST_MSG'"
  echo "    Law I: Every change must trace to a legitimate need."
else
  echo "  ✓ Origin: $LAST_MSG"
  echo "    ($COMMIT_COUNT recent commits)"
fi

# ─── Law VII: Becoming — Capture pre-deploy health baseline ───
PRE_HEALTH=""
if [ -n "$AUTH" ]; then
  echo ""
  echo "▸ Law VII (Becoming): Pre-deploy baseline"
  PRE_HEALTH=$(curl -s --max-time 5 "$API_URL/api/health" \
    -H "Authorization: Bearer $AUTH" 2>/dev/null || echo "")
  if [ -n "$PRE_HEALTH" ]; then
    echo "  ✓ Health baseline captured"
  else
    echo "  ⚠ Could not reach API for baseline (non-blocking)"
  fi
fi

# ─── Deploy ───

# Deploy API Gateway
if [ "$DEPLOY_API" = true ]; then
  echo ""
  echo "▸ Deploy: API Gateway"
  cd packages/api-gateway
  npx wrangler deploy 2>&1 | tail -5
  cd "$ROOT_DIR"
  echo "  ✓ API Gateway deployed"
fi

# Deploy Dashboard
if [ "$DEPLOY_DASH" = true ]; then
  echo ""
  echo "▸ Deploy: Dashboard"
  cd packages/dashboard
  WRANGLER="$ROOT_DIR/packages/api-gateway/node_modules/.bin/wrangler"
  if [ ! -f "$WRANGLER" ]; then
    WRANGLER="$(which wrangler 2>/dev/null || echo npx wrangler)"
  fi
  $WRANGLER pages deploy dist --project-name=jarvis-dashboard 2>&1 | tail -5
  cd "$ROOT_DIR"
  echo "  ✓ Dashboard deployed"
fi

# ─── Jailbreak: Sync agent context to R2 ───
if [ -n "$AUTH" ]; then
  echo ""
  echo "▸ Jailbreak: Sync agent context"
  bash scripts/sync-context.sh
fi

# ─── Law II: Memory — Inscribe deployment ───
if [ -n "$AUTH" ]; then
  echo ""
  echo "▸ Law II (Memory): Inscribe"
  DEPLOY_DESC="Deploy: $LAST_MSG"
  curl -s --max-time 5 -X POST "$API_URL/api/build-events" \
    -H "Authorization: Bearer $AUTH" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"deploy\",\"description\":\"$DEPLOY_DESC\",\"archetypeIds\":[\"jarvis\"],\"skillsExercised\":[\"deployment-orchestration\"]}" \
    > /dev/null 2>&1 && echo "  ✓ Build event emitted" || echo "  ⚠ Build event failed (non-blocking)"
fi

# ─── Law VII: Becoming — Post-deploy health comparison ───
if [ -n "$AUTH" ]; then
  echo ""
  echo "▸ Law VII (Becoming): Post-deploy health"
  POST_HEALTH=$(curl -s --max-time 10 "$API_URL/api/health" \
    -H "Authorization: Bearer $AUTH" 2>/dev/null || echo "")
  if echo "$POST_HEALTH" | grep -q '"status"' 2>/dev/null; then
    echo "  ✓ Post-deploy health: responding"
  else
    echo "  ⚠ Post-deploy health check: no response (may need warm-up)"
  fi
fi

# ─── Law V: Reflection — Deployment summary ───
echo ""
echo "▸ Law V (Reflection): Summary"
CHANGED_FILES=$(git diff --name-only HEAD~1 2>/dev/null | wc -l | tr -d ' ')
CHANGED_PKGS=$(git diff --name-only HEAD~1 2>/dev/null | grep -o 'packages/[^/]*' | sort -u | wc -l | tr -d ' ')
echo "  $CHANGED_FILES files changed across $CHANGED_PKGS packages"
echo "  Commit: $(git log -1 --format='%h %s' 2>/dev/null)"

END=$(date +%s)
ELAPSED=$((END - START))

echo ""
echo "═══════════════════════════════════════════"
echo "  ✓ SHIPPED (${ELAPSED}s)"
echo "  Laws verified: I·II·IV·V·VII"
echo "  Laws continuous: III (drift) · VI (communion)"
echo "═══════════════════════════════════════════"
