---
name: Skills & Files System
description: Claude-like Skills system + Workspace Files — what was added, where, how it connects, naming conflicts fixed
---

## What was built (all additive — no existing code modified)

### skillsEngine.ts — appended at end
- New `UserSkill` type (id, name, description, triggers[], instructions, source, isCustom, linkedFileIds, timestamps)
- localStorage key: `"mr7-ai-custom-skills"`
- Functions: `getAllSkills()`, `getUserSkill()`, `saveSkill()`, `updateSkill()`, `deleteUserSkill()`, `matchUserSkills()`, `buildUserSkillsAddendum()`, `parseSkillMarkdown()`
- **IMPORTANT**: named `getUserSkill` and `deleteUserSkill` (NOT `getSkill`/`deleteSkill`) to avoid clash with existing SkillDefinition functions at lines 162 and 172

### store.tsx — `autoSkillsEnabled: boolean` added to Settings type + default `true`

### ChatView.tsx — additive changes only
- Imports `matchUserSkills`, `buildUserSkillsAddendum`, `createFile`
- State: `activeSkillBadges: string[]`
- Auto-matching before customSysPrompt build (when `autoSkillsEnabled !== false`)
- "🧩 Skill: [name]" violet badges (6s timeout)
- File detection in finally block: ` ```file:path\ncontent``` ` → createFile() + toast

### ClaudeSkillsModal.tsx — full rewrite, all 16 original SKILLS + injectSkill intact
- Two tabs: Browse (original UI) + My Skills (table with Skill/Last used columns)
- "Add ▾" dropdown: Create with Claude | Write skill instructions | Upload a skill
- Create with AI: streamChat → JSON → preview → saveSkill()
- FolderOpen button dispatches `kali:open-file-manager` window event

### UploadSkillModal.tsx (new) — drag-and-drop .md/.zip/.skill files, uses jszip

### FileManagerModal.tsx (new) — file tree + editor, link files to skills

### App.tsx
- Added `'fileManager'` to MODAL_IDS
- Lazy import FileManagerModal
- Window event `kali:open-file-manager` → open('fileManager')

**Why:** Per user request. Full Claude-style Skills system built without touching any existing functionality.
