#!/usr/bin/env bash
# Ollama auto-start — uses workspace-persistent CPU bundle
# Run: bash scripts/start-ollama.sh
set -euo pipefail

BIN="/home/runner/workspace/.ollama-bin/ollama"
LIB="/home/runner/workspace/.ollama-bin/lib/ollama"
MODELS="/home/runner/.ollama/models"

if [ ! -f "$BIN" ]; then
  echo "[ollama] Binary not found at $BIN"
  echo "[ollama] Use the Ollama Hub button in the app to install."
  exit 0
fi

# Kill any stale process
pkill -f "ollama serve" 2>/dev/null || true
sleep 1

echo "[ollama] Starting Ollama ${BIN} ..."
OLLAMA_LIBRARY_PATH="$LIB" \
OLLAMA_MODELS="$MODELS" \
HOME=/home/runner \
"$BIN" serve &>/tmp/ollama.log &

PID=$!
echo "[ollama] PID=$PID"

for i in $(seq 1 15); do
  sleep 1
  if curl -sf http://localhost:11434/api/tags >/dev/null 2>&1; then
    N=$(curl -s http://localhost:11434/api/tags | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('models',[])))" 2>/dev/null || echo "?")
    echo "[ollama] ONLINE — $N models installed"
    exit 0
  fi
done

echo "[ollama] Didn't respond in 15s — check /tmp/ollama.log"
tail -5 /tmp/ollama.log
