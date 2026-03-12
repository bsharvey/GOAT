#!/usr/bin/env bash
# Jailbreak Auto-Continue
# Reads INDEX.md, finds the next unchecked build, prints the spec file path.
# Usage: pnpm jailbreak:next
#
# For Claude Code sessions: read the output path to bootstrap instantly.

MEMORY_DIR="${MEMORY_DIR:-$HOME/.claude/projects/-Users-benjaminharvey-Chairman-Infrastructure/memory}"
INDEX="$MEMORY_DIR/builds/INDEX.md"

if [ ! -f "$INDEX" ]; then
  echo "ERROR: INDEX.md not found at $INDEX"
  exit 1
fi

# Find the first unchecked build line: "- [ ] `build-XX.md`"
# macOS-compatible (no grep -P)
NEXT_LINE=$(grep -m1 '\- \[ \]' "$INDEX" 2>/dev/null)

if [ -z "$NEXT_LINE" ]; then
  echo "ALL BUILDS COMPLETE"
  echo ""
  echo "The civilization has no pending builds."
  echo "To add new builds, edit $INDEX"
  exit 0
fi

# Extract build-XX.md from the line using sed
NEXT=$(echo "$NEXT_LINE" | sed -n 's/.*\(`build-[0-9]*\.md`\).*/\1/p' | tr -d '`')

if [ -z "$NEXT" ]; then
  echo "ALL BUILDS COMPLETE"
  echo ""
  echo "The civilization has no pending builds."
  exit 0
fi

SPEC="$MEMORY_DIR/builds/$NEXT"

if [ -f "$SPEC" ]; then
  echo "NEXT BUILD: $NEXT"
  echo "SPEC FILE:  $SPEC"
  echo ""
  echo "Bootstrap command for Claude Code:"
  echo "  Read $SPEC and execute the build."
else
  echo "NEXT BUILD: $NEXT"
  echo "SPEC FILE:  $SPEC (NOT FOUND — spec needs to be written)"
fi
