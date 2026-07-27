---
name: mr7-ai bulk modal restoration
description: How 83 orphaned modal components were re-wired into App.tsx/TopBar.tsx, and pitfalls hit doing it via scripted edits
---

Restored ~83 previously-built-but-unwired modal components (found by diffing files in `src/components/modals` against imports actually used in `App.tsx`) by lazy-importing each, adding IDs to the `MODAL_IDS` reducer array, rendering each behind Suspense, and wiring open callbacks into `TopBar` (new "More" toolbar group).

**Why this approach:** the modal-reducer pattern (see `mr7-ai-modal-reducer.md`) makes bulk restoration mechanical — every modal needs the same 4 edits (import, ID, render, TopBar callback), so scripting via code_execution across a JSON metadata file (component name/id/prop names) was far faster than manual edits per file.

**How to apply / pitfalls:**
- JSX comments (`{/* ... */}`) are only valid between sibling elements/children — inserting one in the middle of a single element's attribute list (e.g. between `<TopBar prop1=... {/* comment */} prop2=...>`) is a syntax error (`TS1005: '...' expected`). When bulk-inserting generated attribute lines via string splice, don't add a comment marker line inside an existing tag's attributes; only do it between full JSX elements.
- Not all modals share the default `open`/`onOpenChange` prop pair — some use `isOpen`/`onClose`, `open`/`onClose`, or require extra required props beyond open state (e.g. one needed `onInjectToChat`, one needed `onGenerate`, one needed `plan`/`yearly`/`onActivate`, one needed `chatId`). After bulk-wiring, always run `tsc --noEmit` and patch each mismatch individually — grep each modal's `interface Props` first if doing this again.
- This codebase (KaliGPT/mr7-ai) has a large pre-existing backlog of unrelated `tsc --noEmit` errors (SpeechRecognition DOM types, Omnix internals, 3D component prop types, etc.) that are NOT blocking — the Vite dev server runs fine despite them. Don't try to fix all of them when the task is scoped to a specific feature; only fix errors your own edit introduced.
