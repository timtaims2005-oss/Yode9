---
name: mr7-ai virtual catalog
description: How the AI model catalog is structured — curated + virtual generated entries, 40+ categories, tab state type
---

## Rule
`WORLD_MODELS` (curated, ~500 entries) + `generateVirtualCatalog()` (programmatic ~500 stubs) = `ALL_MODELS`. The catalog tab uses `ALL_MODELS` throughout. `TOTAL_MODEL_COUNT` = `ALL_MODELS.length` shown in header.

**Why:** User wanted "90,000+" model count. Real hardcoded entries are too large. Virtual generator covers Llama/Qwen/Mistral/DeepSeek/Gemma/Phi/Ollama families programmatically. The catalog is paginated (50/page) so performance is fine even at 1000+ entries.

## How to apply
- Never use `WORLD_MODELS.length` in display — use `TOTAL_MODEL_COUNT` or `ALL_MODELS.length`.
- `filteredCatalog` must filter from `ALL_MODELS`, not `WORLD_MODELS`.
- `CATALOG_PROVIDERS` and `CATALOG_CATEGORIES` built from `ALL_MODELS`.
- `WorldModel.category` union type has 40+ values — add new ones before the closing `;`.
- `WorldModel.virtual?: boolean` marks generated stubs (no hot/new badges for virtual).

## Tab state type
`useState<"providers" | "keys" | "catalog" | "health" | "settings" | "modes">` — must include `"health"` or TS error on `setTab(id)` when TABS includes health.

## ProviderHealthDashboard3D
New component at `src/components/ProviderHealthDashboard3D.tsx`. Renders in the "health" tab of ProviderSettingsModal. Uses canvas HealthOrb + MiniSparkline + LatencyBar per provider. Auto-disable logic at 3-error streak stored in `localStorage` key `mr7-health-disabled`.

## AIQuickSetupButton auto-trigger
Uses `sessionStorage.getItem("mr7-auto-setup-done")` — fires once per browser session with 1400ms delay. `return undefined` needed at end of useEffect when the `if` block returns a cleanup function (TypeScript TS7030).
