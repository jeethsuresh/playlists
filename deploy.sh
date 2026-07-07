#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Deploy the playlist mashup stack via Docker Compose.

Options:
  --project-name NAME     Docker Compose project name (default: playlists)
  --compose-file FILE     Compose file path (default: docker-compose.yml)
  --host-port PORT        Host port for the web app (default: 3456)
  --detach                Run in detached mode (default)
  --no-detach             Run in foreground
  --postgres-host-port P  Optional Postgres host port for debugging
  -h, --help              Show this help
EOF
}

DETACH=1
POSTGRES_HOST_PORT=""
parse_common_args "$@"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --detach) DETACH=1; shift ;;
    --no-detach) DETACH=0; shift ;;
    --postgres-host-port)
      POSTGRES_HOST_PORT="$2"
      shift 2
      ;;
    *) shift ;;
  esac
done

export HOST_PORT="${HOST_PORT}"
export POSTGRES_HOST_PORT="${POSTGRES_HOST_PORT}"

ENV_FILE="${SCRIPT_DIR}/.env"
if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Missing .env file. Copy .env.example to .env and configure it."
  exit 1
fi

COMPOSE_CMD=(docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" --env-file "${ENV_FILE}")

if [[ -n "${POSTGRES_HOST_PORT}" ]]; then
  export COMPOSE_PROFILES=debug
  COMPOSE_CMD+=(--profile debug)
fi

if [[ "${DETACH}" -eq 1 ]]; then
  "${COMPOSE_CMD[@]}" up -d
else
  "${COMPOSE_CMD[@]}" up
fi

echo "Deployed at http://localhost:${HOST_PORT}"
