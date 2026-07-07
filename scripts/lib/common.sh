#!/usr/bin/env bash
# Shared argument parsing for build/test/deploy/teardown scripts.

parse_common_args() {
  PROJECT_NAME="${PROJECT_NAME:-playlists}"
  COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
  HOST_PORT="${HOST_PORT:-3456}"
  SKIP_INSTALL=0

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --project-name)
        PROJECT_NAME="$2"
        shift 2
        ;;
      --compose-file)
        COMPOSE_FILE="$2"
        shift 2
        ;;
      --host-port)
        HOST_PORT="$2"
        shift 2
        ;;
      --skip-install)
        SKIP_INSTALL=1
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        break
        ;;
    esac
  done

  export PROJECT_NAME COMPOSE_FILE HOST_PORT SKIP_INSTALL
}

# Shared image names so build, staging, and production use the same tags.
export_compose_runtime_env() {
  export COMPOSE_PROJECT_NAME="${PROJECT_NAME}"
  local tag="${DEPLOY_IMAGE_TAG:-latest}"
  export APP_IMAGE="playlists-app:${tag}"
  export WS_IMAGE="playlists-ws:${tag}"
}
