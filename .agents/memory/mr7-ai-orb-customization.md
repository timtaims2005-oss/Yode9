---
name: mr7-ai orb color customization
description: how the 4 TopBar planet-orb icons get user-customizable colors via Settings
---

The 4 TopBar orb components (ProviderHealthBadge3D, AIQuickSetupButton, QuantumPersona3D, PersonaSwitcher3D) each compute their own default color internally (health status / phase / persona category). User overrides live at `state.settings.orbColors?.{health|setup|persona|switcher}` (hex string, optional).

**Why:** users wanted to personalize orb colors without breaking the existing automatic status-color logic (e.g. red for errors) when no override is set.

**How to apply:** `hexToRgb(hex, fallback)` is exported from `PlanetOrb.tsx` for components needing an `[r,g,b]` tuple; `QuantumPersona3D` uses a hex string directly instead. Pattern: `customColor ? hexToRgb(customColor, defaultColor) : defaultColor`, applied only to the color fed into `<PlanetOrb color=.../>` (not to every surrounding glow/border, which can stay tied to status for now). Settings UI lives in `SettingsModal.tsx` with native `<input type="color">` + per-orb reset button, dispatching `SET_SETTINGS { orbColors: {...} }`.
