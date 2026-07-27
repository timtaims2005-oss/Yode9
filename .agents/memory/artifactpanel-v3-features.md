---
name: ArtifactPanel-v3 Phase 1 Features
description: Summary of improvements added to ArtifactPanel-v3.tsx
---

## Features Added

- **Live Edit debounce**: 900ms → 500ms in split mode; code-only mode now also updates previewCode in background after 500ms so switching to preview shows latest
- **localStorage auto-save**: key `av3-code-${artifactId}`, saves 800ms after change, loads on mount (won't auto-run on load)
- **Share Link**: `btoa(unescape(encodeURIComponent(code)))` → `/artifact-preview?code=...&lang=...`, clipboard + inline toast. Matches ArtifactPreviewPage's `atob` decoding.
- **Minimize → floating pill**: `minimized` state; pill renders via `createPortal` at bottom-right (z-10000); Ctrl+M shortcut to toggle

**Why:** All features are self-contained in ArtifactPanel-v3.tsx with no external deps. Pill renders into document.body to avoid stacking context issues.
