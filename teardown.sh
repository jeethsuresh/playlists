#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Tear down the playlist mashup Docker Compose stack.

Options:
  --project-name NAME     Docker Compose project name (default: playlists)
  --compose-file FILE     Compose file path (default: docker-compose.yml)
  --host-port PORT        Host port (unused, for consistency)
  --volumes               Remove named volumes
  --no-remove-orphans     Do not remove orphan containers
  -h, --help              Show this help
EOF
}

REMOVE_VOLUMES=0
REMOVE_ORPHANS="--remove-orphans"
parse_common_args "$@"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --volumes) REMOVE_VOLUMES=1; shift ;;
    --no-remove-orphans) REMOVE_ORPHANS=""; shift ;;
    *) shift ;;
  esac
done

DOWN_ARGS=(down)
if [[ "${REMOVE_VOLUMES}" -eq 1 ]]; then
  DOWN_ARGS+=(-v)
fi
if [[ -n "${REMOVE_ORPHANS}" ]]; then
  DOWN_ARGS+=("${REMOVE_ORPHANS}")
fi

docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" --profile debug "${DOWN_ARGS[@]}"
echo "Teardown complete."
