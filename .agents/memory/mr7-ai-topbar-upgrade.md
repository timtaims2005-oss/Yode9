---
name: mr7-ai TopBar full upgrade & component restoration
description: TopBar visual upgrade details, newly mounted components, and Sidebar destructuring fix
---

## Rule
When rewriting TopBar: always make all layout props optional to avoid breaking App.tsx callers. Sidebar destructuring MUST list every prop that JSX references — missing from destructuring = ReferenceError at runtime (not undefined).

**Why:** TopBarProps has 100+ optional props. Sidebar had onOpenOsintHub in JSX but not in destructure, causing runtime ReferenceError.

## Components restored and how they mount
- **HoloNotificationProvider** — always mounted (no props) at very top of AppContent JSX, inside `<Suspense>`
- **AmbientLayer** — toggleable (`showAmbientLayer` state, default true), lazy, inside ambient `<Suspense>` block
- **FuturisticBackground3D** — toggleable (`showFuturisticBg` state, default true), opacity=0.35, same `<Suspense>`
- **UltraHUD** — toggleable (`showUltraHUD` state, default false), lazy
- **SystemStatusWidget** — toggleable (`showSystemStatus` state, default true), lazy, no props
- **IntelligenceHUDOverlay** — toggleable, needs `onOpenCommandCenter={() => open('cyberHub')}`
- **NotificationCenter** — toggleable, no required props (`compact` optional)
- **QuickDock3D** — toggleable, needs 8 onOpen props (arsenal/agent/nexus/warRoom/cognitiveWarfare/autonomousOffense/cyberHierarchy/attackGraph)

## TopBar design conventions
- 5 groups: Tools (cyan #00e5ff), Agents (purple #a78bfa), Intel (green #22c55e), HUD (red #e21227), More (amber #f59e0b)
- Each group button: `background: color + "18"`, `border: color + "35"`, `boxShadow: color + "18"`
- Active badge: absolute -top-1 -right-1, filled with group color
- Quick HUD toggle row (xl screens): 9 buttons, glows when active
- PRO button: gradient #e21227 → #7a0d16 with box-shadow glow

## How to apply
Any new toggleable overlay added to App.tsx needs: (1) state, (2) toggle passed to TopBar as `onToggleX` + `showX` props, (3) entry in `hudItems` array in TopBar, (4) entry in `activeHudCount` calculation.
