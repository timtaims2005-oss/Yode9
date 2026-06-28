---
name: mr7-ai Sidebar Props
description: Sidebar component requires props in BOTH interface AND destructuring; omitting from destructuring causes ReferenceError (not just undefined).
---

# Sidebar Props Convention

**Rule:** Every prop in `SidebarProps` interface MUST also appear in the `Sidebar` function destructuring. Adding to interface only causes a `ReferenceError` at runtime.

**Why:** JSX like `{onOpenAptIntel && (<button onClick={onOpenAptIntel}>...)}` uses `onOpenAptIntel` as a JavaScript variable. If it's not destructured from props, JS throws `ReferenceError: onOpenAptIntel is not defined` — not a harmless `undefined` check.

**Current props list ends with:** `..., onOpenKgSocialArsenal, onOpenAptIntel, onOpenNexusPanel`

**How to apply:** When adding a new prop to SidebarProps interface, always add it to BOTH:
1. The `interface SidebarProps` block (around line 173 in Sidebar.tsx)
2. The `export function Sidebar({ ... }: SidebarProps)` destructuring (around line 297)
3. Pass it from App.tsx `<Sidebar ... onOpenNewProp={...} />`
