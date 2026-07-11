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
  # Forge only tags app images (next/stable/rollback); ws always comes from the latest build.
  export WS_IMAGE="playlists-ws:latest"
}

# Use https for public hostnames so session cookies work behind TLS terminators.
normalize_auth_url() {
  local url="${1:-}"
  [[ -n "${url}" ]] || return 0

  if [[ "${url}" =~ ^http://(127\.0\.0\.1|localhost)(:[0-9]+)?(/|$) ]]; then
    printf '%s' "${url}"
    return 0
  fi

  if [[ "${url}" =~ ^http:// ]]; then
    printf 'https://%s' "${url#http://}"
    return 0
  fi

  printf '%s' "${url}"
}

# Load .env defaults without overriding variables already set (e.g. by Forge).
load_env_defaults() {
  local env_file="$1"
  [[ -f "${env_file}" ]] || return 0

  while IFS= read -r line || [[ -n "${line}" ]]; do
    line="${line%%#*}"
    line="${line#"${line%%[![:space:]]*}"}"
    line="${line%"${line##*[![:space:]]}"}"
    [[ -n "${line}" ]] || continue
    [[ "${line}" == export* ]] && line="${line#export }"
    [[ "${line}" == *"="* ]] || continue

    local key="${line%%=*}"
    local value="${line#*=}"
    key="${key%"${key##*[![:space:]]}"}"
    key="${key#"${key%%[![:space:]]*}"}"

    if [[ ! "${key}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
      continue
    fi
    if [[ -z "${!key:-}" ]]; then
      export "${key}=${value}"
    fi
  done < "${env_file}"
}
