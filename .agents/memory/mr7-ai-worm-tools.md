---
name: Worm_tools OMNIX ABSOLUTE Integration
description: How the 9-system OMNIX ABSOLUTE from Worm_tools.md was integrated into the project
---

# OMNIX ABSOLUTE Integration from Worm_tools.md

**Why:** Worm_tools.md defined all 9 OMNIX ABSOLUTE systems but they were not wired to the live app.

## Key Finding
OmnixAbsolute.ts (1422 lines) already had ALL 9 systems more advanced than Worm_tools.md (873 lines). The missing pieces were integration points.

## 4 Critical Integrations Added

### 1. processResponse() Connected to All AI Paths (ChatView.tsx)
After every AI response (callModel, callGodmode, callCouncilWith), now calls:
`OmnixAbsoluteCore.getInstance().processResponse(acc, lastUser).catch(() => {});`
This handles `<omnix-commands>[...]</omnix-commands>` format from Worm_tools.md.

### 2. `<omnix-commands>` Format Added to System Prompt (NexusInterceptor.ts)
AI now knows to emit both:
- `<omnix-commands>[...]</omnix-commands>` (primary — Worm_tools.md format)
- `<<<OMNIX_ACTIONS>>>...<<<<END_OMNIX>>>` (legacy format)

### 3. Component Registration (App.tsx)
14 app components registered with `OmnixAbsoluteSovereign.getInstance()`:
app, sidebar, topbar, arsenal-hub, council, godmode, voice-chat, vision, dark-web, shell-gen, rag, agent-ide, omnix-hud, omnix-voice, omnix-evo, omnix-palette

ChatView also self-registers on mount and unregisters on unmount.

### 4. OMNIX Button Added to Sidebar
- New `onOpenOmnixAbsolute` prop added to SidebarProps interface
- Violet pulsing button in bottom tool bar of Sidebar
- Opens OmnixAbsoluteDashboard (already existed, accessible via Ctrl+Shift+F1)

## What Was Already Working
- OmnixAbsoluteDashboard.tsx (853 lines) — complete 7-tab dashboard
- OmnixHUDPanel, OmnixVoice, OmnixSelfEvolution, OmnixCommandPalette — all rendered in App.tsx
- registerBuiltinCommands() — 54+ real commands (10 themes + 6 system + 44 modal open/close)
- event listeners for omnix:open-modal, omnix:close-modal, omnix:set-theme, omnix:open-absolute

## Two OmnixSovereign Classes (IMPORTANT)
- `lib/OmnixSovereign.ts` → state store (used by OmnixHUD.tsx)
- `lib/OmnixAbsolute.ts` exports `OmnixSovereign` → component live map (used by OmnixAbsoluteDashboard)
These are DIFFERENT classes. Import as `OmnixSovereign as OmnixAbsoluteSovereign` to avoid confusion.
