---
name: mr7-ai SW cache
description: Service worker caches compiled JS — HMR edits don't reach browser until cache is invalidated.
---

# Service Worker Cache Pitfall

**Rule:** When `public/sw.js` caches ALL GET requests, Vite HMR edits to source files never reach the browser — it always serves the SW-cached compiled version.

**Why:** The KaliGPT service worker used a "cache-first" strategy with no exclusions. Once the compiled `Sidebar.tsx?v=xxx` module was cached, every reload served the OLD version regardless of source changes.

**Symptoms:**
- `ReferenceError: variable is not defined` even though the variable is clearly in the source
- Vite HMR logs show "update applied" but browser behavior doesn't change
- Cache-clearing (`.vite/`) and workflow restart don't fix it

**Fix applied:**
1. Bumped `CACHE_NAME` from `kaligpt-v3` → `kaligpt-v4` (forces SW reinstall, wipes old cache)
2. Added exclusions in fetch handler: skip caching when URL path starts with `/src/`, `/node_modules/`, `/@`, or URL params include `t=` or `v=` (Vite fingerprints)

**How to apply:** Any time source edits seem to not take effect in browser despite HMR confirming changes — suspect SW cache. Bump CACHE_NAME to force invalidation.
