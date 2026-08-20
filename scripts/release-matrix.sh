#!/usr/bin/env bash
set -euo pipefail

PORT="${WEBOS_MATRIX_PORT:-4178}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_LOG="${TMPDIR:-/tmp}/webos-release-matrix-${PORT}.log"

cleanup() {
	if [[ -n "${SERVER_PID:-}" ]]; then
		kill "${SERVER_PID}" 2>/dev/null || true
		wait "${SERVER_PID}" 2>/dev/null || true
	fi
	playwright-cli close-all >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

bun x vite --host 127.0.0.1 --port "$PORT" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for _ in {1..30}; do
	if curl --silent --fail "http://127.0.0.1:${PORT}/?debug" >/dev/null; then break; fi
	sleep 1
done

for browser in chrome firefox; do
	session="webos-matrix-${browser}"
	playwright-cli -s="$session" open "http://127.0.0.1:${PORT}/?debug" --browser="$browser" --headed >/dev/null
	playwright-cli -s="$session" run-code --filename "$ROOT/scripts/release-matrix-browser.mjs"
	playwright-cli -s="$session" close >/dev/null
done
