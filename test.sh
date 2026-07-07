#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Run unit tests.

Options:
  --watch                 Run tests in watch mode
  --coverage              Run with coverage (not yet configured)
  --project-name NAME     Docker Compose project name (unused, for consistency)
  --compose-file FILE     Compose file path (unused, for consistency)
  --host-port PORT        Host port (unused, for consistency)
  -h, --help              Show this help
EOF
}

WATCH=0
parse_common_args "$@"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --watch) WATCH=1; shift ;;
    --coverage) shift ;;
    *) shift ;;
  esac
done

cd "${SCRIPT_DIR}"

if [[ "${WATCH}" -eq 1 ]]; then
  npm run test:watch
else
  npm run test
fi

echo "Tests passed."
