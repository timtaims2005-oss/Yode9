---
name: OMNIX ABSOLUTE system
description: Architecture and wiring of the 7-subsystem OMNIX AI control layer built on top of the existing Nexus system in mr7-ai.
---

## Files
- `src/lib/OmnixBrain.ts` — singleton snapshot of entire app state; `patch()`, `setModelConfig()`, `setTheme()`, `toContextString()`
- `src/lib/OmnixMemory.ts` — localStorage-persisted action history, command stats, user preferences, learned commands
- `src/lib/OmnixRegistry.ts` — 70+ commands (Nexus merged + OMNIX extras); `OMNIX_COMMAND_REGISTRY`, `OMNIX_REGISTRY_MAP`, `matchNaturalLanguage()`, `buildRegistryContextString()`
- `src/lib/OmnixExecutor.ts` — parses `<<<OMNIX_ACTIONS>>>` blocks; 3-fallback execution; `registerOmnixDispatchers()`, `executeOmnixResponse()`, `stripOmnixBlocks()`
- `src/lib/NexusInterceptor.ts` — `buildNexusSystemPrompt()` now injects Brain+Memory+Registry context; `stripNexusBlocks()` strips all 3 block formats
- `src/components/OmnixHUD.tsx` — `OmnixHUDPanel` (4 tabs: status/commands/memory/log) + `OmnixFloatingBadge` (bottom-left)
- `src/components/OmnixVoice.tsx` — Web Speech API Arabic/English + text input
- `src/components/OmnixSelfEvolution.tsx` — usage-pattern suggestions + one-click learn/approve
- `src/components/OmnixCommandPalette.tsx` — global Ctrl+Shift+Z searchable command palette

## Keyboard shortcuts
- `Ctrl+Shift+Z` — OMNIX panel / command palette toggle
- `Ctrl+Shift+V` — OMNIX voice interface
- `Ctrl+Shift+O` — OSINT dash (existing, NOT OMNIX)

## Action block format (AI must use)
```
<<<OMNIX_ACTIONS>>>
[{"action": "command_id", "params": {"key": "value"}}]
<<<END_OMNIX>>>
```
Also accepts `<<<NEXUS_ACTIONS>>>...<<<END_NEXUS>>>` and `<<<ACTIONS>>>...<<<END_ACTIONS>>>` for backward compat.

## App.tsx wiring
- `registerOmnixDispatchers(nexusDispatchers)` called in useEffect on mount
- All 4 OMNIX components rendered at top level (outside the main div, alongside NexusExecutorHUD)
- State: `omnixPanelOpen`, `omnixVoiceOpen`, `omnixEvoOpen`, `omnixPaletteOpen`

## ChatMessage.tsx
- `stripOmnixBlocks()` applied in `getDisplayContent()` before rendering — removes action blocks from user-visible text

## pnpm compatibility
- Node.js v20 requires pnpm@9.15.4 (pnpm v10+ needs Node.js v22+)
- Fix: `npm install -g pnpm@9.15.4`

**Why:** The OMNIX system extends (not replaces) Nexus. All Nexus dispatchers are reused. The Brain keeps a live snapshot synced via `buildNexusSystemPrompt()` on every AI call.
