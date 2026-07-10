#!/bin/bash
set -e
cd /home/runner/workspace/artifacts/api-server
PORT=8080 NODE_ENV=production node --enable-source-maps ./dist/index.mjs &
API_PID=$!

cd /home/runner/workspace/artifacts/mr7-ai
PORT=5000 BASE_PATH=/ NODE_ENV=production node_modules/.bin/vite preview --config vite.config.ts --host 0.0.0.0 --port 5000 &
WEB_PID=$!

wait -n "$API_PID" "$WEB_PID"
