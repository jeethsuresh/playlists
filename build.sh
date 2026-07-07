#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/lib/common.sh
source "${SCRIPT_DIR}/scripts/lib/common.sh"

usage() {
  cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Build Docker images for the playlist mashup app.

Options:
  --project-name NAME     Docker Compose project name (default: playlists)
  --compose-file FILE     Compose file path (default: docker-compose.yml)
  --host-port PORT        Host port for the web app (default: 3456)
  --skip-install          Skip npm install
  -h, --help              Show this help
EOF
}

parse_common_args "$@"
shift $((OPTIND - 1))

if [[ "${SKIP_INSTALL:-0}" -ne 1 ]]; then
  echo "Installing dependencies..."
  npm install
fi

export_compose_runtime_env

echo "Building Docker images (project: ${PROJECT_NAME}, tag: ${DEPLOY_IMAGE_TAG:-latest})..."
docker compose -f "${COMPOSE_FILE}" -p "${PROJECT_NAME}" build

echo "Build complete."
