#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
TARGET="${1:-all}"

bold=$'\033[1m'; dim=$'\033[2m'; green=$'\033[32m'; red=$'\033[31m'; reset=$'\033[0m'

log()  { printf '%s==>%s %s\n' "$bold" "$reset" "$1"; }
die()  { printf '%s error:%s %s\n' "$red" "$reset" "$1" >&2; exit 1; }

require() {
  command -v "$1" >/dev/null 2>&1 || die "'$1' is not installed. Get it here: $2"
}

port_busy() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN >/dev/null 2>&1
}

pids=()

kill_tree() {
  local pid=$1 child
  for child in $(pgrep -P "$pid" 2>/dev/null); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

cleanup() {
  local status=$?
  trap - INT TERM EXIT
  if [ ${#pids[@]} -gt 0 ]; then
    log "stopping services..."
    for pid in "${pids[@]}"; do
      kill_tree "$pid"
    done
    wait 2>/dev/null || true
  fi
  exit "$status"
}
trap cleanup INT TERM EXIT

start_backend() {
  require uv "https://docs.astral.sh/uv/getting-started/installation/"
  port_busy "$BACKEND_PORT" && die "port $BACKEND_PORT is already in use (run BACKEND_PORT=8001 ./dev.sh to change it)"

  log "installing backend dependencies (uv sync)"
  (cd "$ROOT/backend" && uv sync)

  log "starting backend"
  (cd "$ROOT/backend" && uv run fastapi dev main.py --port "$BACKEND_PORT") &
  pids+=($!)
}

start_frontend() {
  require pnpm "https://pnpm.io/installation"
  port_busy "$FRONTEND_PORT" && die "port $FRONTEND_PORT is already in use (run FRONTEND_PORT=5174 ./dev.sh to change it)"

  log "installing frontend dependencies (pnpm install)"
  (cd "$ROOT/frontend" && pnpm install)

  log "starting frontend"
  (cd "$ROOT/frontend" && VITE_API_URL="http://localhost:$BACKEND_PORT" pnpm dev --port "$FRONTEND_PORT" --strictPort) &
  pids+=($!)
}

case "$TARGET" in
  all)      start_backend; start_frontend ;;
  backend)  start_backend ;;
  frontend) start_frontend ;;
  *)        die "usage: ./dev.sh [backend|frontend]" ;;
esac

printf '\n%s%sReady%s\n' "$bold" "$green" "$reset"
if [ "$TARGET" = all ] || [ "$TARGET" = frontend ]; then
  printf '  Frontend      %shttp://localhost:%s%s\n' "$bold" "$FRONTEND_PORT" "$reset"
fi
if [ "$TARGET" = all ] || [ "$TARGET" = backend ]; then
  printf '  Backend       %shttp://localhost:%s%s\n' "$bold" "$BACKEND_PORT" "$reset"
  printf '  API docs      %shttp://localhost:%s/docs%s\n' "$bold" "$BACKEND_PORT" "$reset"
  printf '  ReDoc         %shttp://localhost:%s/redoc%s\n' "$bold" "$BACKEND_PORT" "$reset"
fi
printf '\n%sCtrl+C to stop%s\n\n' "$dim" "$reset"

wait
