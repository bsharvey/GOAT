#!/usr/bin/env bash
# Jailbreak Context Sync — Upload CLAUDE.md to R2 for agent engine context
#
# Reads CLAUDE.md from the repo root, posts to the sync-context endpoint
# which condenses it and stores in R2. This gives the cloud-mode agent engine
# access to the full civilization's knowledge without hardcoded prompts.
#
# Called by: pnpm ship (after deploy, before Law II inscription)
# Manual:    pnpm sync:context

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
API_URL="${JARVIS_API_URL:-https://jarvis-api-gateway.ben-c1f.workers.dev}"
AUTH="${JARVIS_AUTH_SECRET:-}"

if [ -z "$AUTH" ]; then
  echo "  ⚠ No auth secret — skipping context sync"
  exit 0
fi

if [ ! -f "$ROOT_DIR/CLAUDE.md" ]; then
  echo "  ⚠ CLAUDE.md not found — skipping context sync"
  exit 0
fi

# Read CLAUDE.md and escape for JSON
CLAUDE_MD=$(cat "$ROOT_DIR/CLAUDE.md" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' 2>/dev/null || cat "$ROOT_DIR/CLAUDE.md" | jq -Rsa .)

RESPONSE=$(curl -s --max-time 15 -X POST "$API_URL/api/agent-engine/sync-context" \
  -H "Authorization: Bearer $AUTH" \
  -H "Content-Type: application/json" \
  -d "{\"claudeMd\":$CLAUDE_MD}" 2>/dev/null)

if echo "$RESPONSE" | grep -q '"synced":true' 2>/dev/null; then
  CHARS=$(echo "$RESPONSE" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("covenantChars","?"))' 2>/dev/null || echo "?")
  echo "  ✓ Agent context synced to R2 (${CHARS} chars)"
else
  echo "  ⚠ Context sync failed (non-blocking)"
fi
