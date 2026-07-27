---
name: mr7-ai Ollama Hub
description: Ollama local model server — binary paths, CPU lib extraction, workflow auto-start, inference confirmed
---

## Ollama Binary & Libs

- Binary: `/home/runner/workspace/.ollama-bin/ollama` (37MB, CPU-only, v0.30.10) — workspace-persistent
- CPU Libs: `/home/runner/workspace/.ollama-bin/lib/ollama/` (35 files, ~27MB)
  - Includes: `llama-server`, `libggml-*.so`, `libllama-*.so`, `libgomp.so`, `libmtmd.so`
  - NO CUDA libs (cuda_v12, cuda_v13, vulkan excluded to save disk space)
- Models dir: `/home/runner/.ollama/models/` (NOT workspace — home dir only, not persistent across repls)

## Extraction Method (re-install recipe)

Full Ollama tarball (~1.4GB) downloaded to `/tmp/ollama.tar.zst`.
Extract CPU-only files (no cuda/vulkan) to get ~64MB total:
```bash
mkdir -p /tmp/ol-cpu && tar --use-compress-program=zstd -xf /tmp/ollama.tar.zst \
  --exclude='lib/ollama/cuda_v12' --exclude='lib/ollama/cuda_v13' --exclude='lib/ollama/vulkan' \
  -C /tmp/ol-cpu
# Then copy:
cp /tmp/ol-cpu/bin/ollama /home/runner/workspace/.ollama-bin/ollama
cp -r /tmp/ol-cpu/lib/ollama /home/runner/workspace/.ollama-bin/lib/
```

## Critical: OLLAMA_LIBRARY_PATH

MUST set `OLLAMA_LIBRARY_PATH=/home/runner/workspace/.ollama-bin/lib/ollama` at startup.
Without it, `llama-server` not found → server starts, lists models, but inference FAILS silently.

## Launch Method

Must use Python `subprocess.Popen(..., start_new_session=True)` to detach from shell.
Shell `nohup ... &` gets killed when bash tool session ends.
Launcher script: `scripts/launch-ollama.py`

## Workflow Integration

"Start application" workflow command includes:
```
python3 scripts/launch-ollama.py & pnpm --filter @workspace/api-server run dev & pnpm --filter @workspace/mr7-ai run dev
```

## API Routes (ollama.ts at api-server)

- `GET /api/ollama/status` — running, models, version, binExists
- `POST /api/ollama/start` — starts daemon (startDaemon() sets OLLAMA_LIBRARY_PATH)
- `POST /api/ollama/pull` — pull model, streams SSE progress
- `DELETE /api/ollama/model/:name` — delete model
- `POST /api/ollama/chat/stream` — SSE chat with local model

## Confirmed Working

- `qwen2.5:0.5b` (398MB) — CONFIRMED inference: `curl /api/chat` returns `Hello.`
- `tinyllama` (637MB) — being pulled

## 7 Recommended CPU Models

1. `qwen2.5:0.5b` (395MB)
2. `tinyllama` (637MB)
3. `deepseek-r1:1.5b` (1.1GB)
4. `llama3.2:1b` (1.3GB)
5. `gemma2:2b` (1.6GB)
6. `phi3:mini` (2.2GB)
7. `mistral:7b-q4_0` (4.1GB) — needs ~8GB RAM

## Frontend

`OllamaHub3D.tsx` — Three.js orbital system, 7 planet models, particle field, 4 tabs.
Accessible via purple "Ollama" button in TopBar (`onOpenOllamaHub` prop).
Modal ID `ollamaHub` registered in App.tsx.
