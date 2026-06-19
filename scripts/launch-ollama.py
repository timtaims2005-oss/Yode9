#!/usr/bin/env python3
"""Launch Ollama daemon in a detached session so it survives bash exit."""
import subprocess, os, sys, time, urllib.request, json

BIN = "/home/runner/workspace/.ollama-bin/ollama"
LIB = "/home/runner/workspace/.ollama-bin/lib/ollama"

def is_running():
    try:
        with urllib.request.urlopen("http://localhost:11434/api/tags", timeout=3) as r:
            return r.status == 200
    except:
        return False

if is_running():
    print("[ollama] Already running")
    sys.exit(0)

if not os.path.isfile(BIN):
    print(f"[ollama] Binary not found: {BIN}")
    sys.exit(0)

env = os.environ.copy()
env["OLLAMA_LIBRARY_PATH"] = LIB
env["OLLAMA_MODELS"] = "/home/runner/.ollama/models"
env["HOME"] = "/home/runner"

with open("/tmp/ollama.log", "w") as log:
    p = subprocess.Popen(
        [BIN, "serve"],
        env=env,
        stdout=log,
        stderr=log,
        start_new_session=True,
    )

print(f"[ollama] Started PID={p.pid}")

for _ in range(20):
    time.sleep(1)
    if is_running():
        print("[ollama] ONLINE")
        sys.exit(0)

print("[ollama] Did not respond in 20s — check /tmp/ollama.log")
sys.exit(1)
