#!/usr/bin/env bash
# Starts the Ollama server if it is not already running.
# Run this before executing the Playwright test suite when self-healing is enabled.
#
# Usage:
#   ./scripts/start-ollama.sh            # start and leave running in background
#   ./scripts/start-ollama.sh --wait     # block until Ollama is ready, then exit
#   ./scripts/start-ollama.sh --stop     # stop the background Ollama process

set -euo pipefail

OLLAMA_HOST="${OLLAMA_BASE_URL:-http://localhost:11434}"
PIDFILE="/tmp/ollama-playwright.pid"

is_running() {
  curl -sf "${OLLAMA_HOST}/api/tags" > /dev/null 2>&1
}

case "${1:-}" in
  --stop)
    if [[ -f "$PIDFILE" ]]; then
      PID=$(cat "$PIDFILE")
      echo "Stopping Ollama (pid $PID)..."
      kill "$PID" 2>/dev/null || true
      rm -f "$PIDFILE"
      echo "Ollama stopped."
    else
      echo "No managed Ollama process found (no pidfile at $PIDFILE)."
    fi
    exit 0
    ;;

  --wait)
    if is_running; then
      echo "Ollama already running at ${OLLAMA_HOST}"
      exit 0
    fi
    echo "Starting Ollama..."
    ollama serve &
    echo $! > "$PIDFILE"
    echo "Waiting for Ollama to be ready..."
    for i in $(seq 1 30); do
      if is_running; then
        echo "Ollama is ready at ${OLLAMA_HOST}"
        exit 0
      fi
      sleep 1
    done
    echo "ERROR: Ollama did not become ready within 30 seconds." >&2
    exit 1
    ;;

  *)
    if is_running; then
      echo "Ollama already running at ${OLLAMA_HOST}"
      exit 0
    fi
    echo "Starting Ollama in background..."
    ollama serve &
    echo $! > "$PIDFILE"
    echo "Ollama started (pid $(cat $PIDFILE)). Use --stop to shut it down."
    ;;
esac
