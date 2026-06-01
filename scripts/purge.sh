#!/usr/bin/env bash
# =============================================================================
# AcademiQ Web — purge
# =============================================================================
# DESTRUCTIVE: deletes .next/ (build output) and node_modules/.
# You will need to run 'pnpm install' before 'make dev' afterwards.
#
# Usage: bash scripts/purge.sh [--yes]
#   --yes   skip the interactive prompt (for CI / scripted use)
#
# Called by: make purge
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
RESET='\033[0m'

SKIP_PROMPT="${1:-}"

if [ "$SKIP_PROMPT" != "--yes" ]; then
  printf "${RED}\n"
  echo "  ╔══════════════════════════════════════════════════════════╗"
  echo "  ║  WARNING: purge will permanently DELETE:                 ║"
  echo "  ║    • .next/  (build output)                              ║"
  echo "  ║    • node_modules/  (all installed packages)             ║"
  echo "  ║  You will need to run 'pnpm install' before 'make dev'.  ║"
  echo "  ╚══════════════════════════════════════════════════════════╝"
  printf "${RESET}\n"
  printf "  Type 'yes' to continue, anything else to abort: "
  read -r ans
  if [ "$ans" != "yes" ]; then
    echo ">> aborted."
    exit 0
  fi
fi

echo ">> deleting .next/ and node_modules/..."
rm -rf .next node_modules

echo ">> purge complete."
echo "   Run 'pnpm install && make dev' to restore the dev environment."
