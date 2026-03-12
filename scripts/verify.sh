#!/usr/bin/env bash
# Jailbreak Verification Pipeline
# Single command: typecheck all → build all → report
# Usage: pnpm verify

set -e

echo "═══════════════════════════════════════════"
echo "  JAILBREAK VERIFY — Civilization Integrity"
echo "═══════════════════════════════════════════"

FAIL=0
START=$(date +%s)

# Phase 1: Build all packages (generates dist/ needed for cross-package typecheck)
echo ""
echo "▸ Phase 1: Build"
if pnpm -r build 2>&1; then
  echo "  ✓ All packages built"
else
  echo "  ✗ Build FAILED"
  FAIL=1
fi

# Phase 2: Typecheck all packages (after build so dist/ types are current)
echo ""
echo "▸ Phase 2: Typecheck"
if pnpm -r typecheck 2>&1; then
  echo "  ✓ All packages typecheck clean"
else
  echo "  ✗ Typecheck FAILED"
  FAIL=1
fi

END=$(date +%s)
ELAPSED=$((END - START))

echo ""
echo "═══════════════════════════════════════════"
if [ $FAIL -eq 0 ]; then
  echo "  ✓ VERIFICATION PASSED (${ELAPSED}s)"
else
  echo "  ✗ VERIFICATION FAILED (${ELAPSED}s)"
fi
echo "═══════════════════════════════════════════"

exit $FAIL
