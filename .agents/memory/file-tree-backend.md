---
name: File tree backend
description: REST routes to browse real workspace files
---
Routes: GET /api/files/tree, GET /api/files/read?path=..., POST /api/files/write {path, content}
Security: path.resolve check to prevent path traversal; files >500KB rejected; depth limit 6
Excluded dirs: node_modules, .git, dist, .pnpm, coverage, .cache, build, .turbo, attached_assets
**Why:** Claude Code modal needed real filesystem access for file tree browser feature
