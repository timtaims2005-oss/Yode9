#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════╗
# ║         Pull multiple Ollama models in parallel              ║
# ║  Usage: bash scripts/pull-models.sh [model1 model2 ...]     ║
# ║  No args = uses DEFAULT_MODELS list below                    ║
# ╚══════════════════════════════════════════════════════════════╝
set -euo pipefail

BIN="/home/runner/workspace/.ollama-bin/ollama"
OLLAMA_API="http://localhost:11434"

# ── Default models (lightweight, fit in Replit storage) ───────
DEFAULT_MODELS=(
  "mistral"
  "llama2"
  "qwen:7b"
  "phi3:mini"
  "gemma:2b"
)

# ── Colours ───────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

log()  { echo -e "${CYAN}[pull-models]${RESET} $*"; }
ok()   { echo -e "${GREEN}✅ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠️  $*${RESET}"; }
err()  { echo -e "${RED}❌ $*${RESET}"; }

# ── Ensure Ollama is running ───────────────────────────────────
ensure_ollama() {
  if curl -sf "$OLLAMA_API/api/tags" >/dev/null 2>&1; then
    ok "Ollama is running"
    return 0
  fi
  warn "Ollama not running — starting..."
  if [ ! -f "$BIN" ]; then
    err "Binary not found at $BIN. Run: bash scripts/install-ollama.sh"
    exit 1
  fi
  OLLAMA_MODELS="/home/runner/.ollama/models" HOME=/home/runner \
    "$BIN" serve &>/tmp/ollama.log &
  for i in $(seq 1 20); do
    sleep 1
    if curl -sf "$OLLAMA_API/api/tags" >/dev/null 2>&1; then
      ok "Ollama started"; return 0
    fi
  done
  err "Ollama failed to start. Check /tmp/ollama.log"
  exit 1
}

# ── Check free disk space (need at least 5GB) ─────────────────
check_disk() {
  FREE_GB=$(df -BG /home/runner 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
  log "Free disk: ~${FREE_GB}GB"
  if [ "${FREE_GB:-0}" -lt 4 ]; then
    warn "Less than 4GB free — large models may fail. Consider pulling smaller ones."
  fi
}

# ── Pull a single model ────────────────────────────────────────
pull_model() {
  local model="$1"
  log "Pulling ${BOLD}${model}${RESET}..."
  if "$BIN" pull "$model" 2>&1 | tee "/tmp/pull-${model//\//_}.log"; then
    ok "Model ready: $model"
    return 0
  else
    err "Failed to pull: $model (see /tmp/pull-${model//\//_}.log)"
    return 1
  fi
}

# ── Pull models in parallel ────────────────────────────────────
pull_parallel() {
  local models=("$@")
  local pids=()
  local names=()

  log "Pulling ${#models[@]} models in parallel: ${models[*]}"
  echo ""

  for model in "${models[@]}"; do
    pull_model "$model" &
    pids+=($!)
    names+=("$model")
  done

  local failed=()
  for i in "${!pids[@]}"; do
    if wait "${pids[$i]}"; then
      : # ok
    else
      failed+=("${names[$i]}")
    fi
  done

  echo ""
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

  # List installed models
  INSTALLED=$(curl -s "$OLLAMA_API/api/tags" | python3 -c \
    "import sys,json; [print(' •', m['name']) for m in json.load(sys.stdin).get('models',[])]" 2>/dev/null)
  ok "Installed models:"
  echo "$INSTALLED"

  if [ ${#failed[@]} -gt 0 ]; then
    warn "Failed to pull: ${failed[*]}"
    echo "  Run manually: $BIN pull <model-name>"
  fi
  echo -e "${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
}

# ── Main ───────────────────────────────────────────────────────
echo -e "${BOLD}"
echo "╔══════════════════════════════════════════════════════╗"
echo "║       Ollama Multi-Model Puller — mr7.ai             ║"
echo "╚══════════════════════════════════════════════════════╝"
echo -e "${RESET}"

ensure_ollama
check_disk

if [ $# -gt 0 ]; then
  MODELS=("$@")
else
  MODELS=("${DEFAULT_MODELS[@]}")
fi

pull_parallel "${MODELS[@]}"
