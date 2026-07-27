#!/usr/bin/env python3
"""
Fix misplaced `useTools: true,` in fetch() options across all modal files.
The `useTools` property is not a valid RequestInit prop — move it inside the
JSON.stringify body where it belongs.
"""

import re, os, sys

MODAL_DIR = "artifacts/mr7-ai/src/components/modals"
OSINT_DIR = "artifacts/mr7-ai/src/components/osint"

def fix_file(filepath):
    with open(filepath, "r") as f:
        content = f.read()

    lines = content.split("\n")
    changed = False
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        # Find a standalone `useTools: true,` that is NOT inside JSON.stringify on the same line
        if stripped == "useTools: true," and "JSON.stringify" not in line:
            # Search backward for `body: JSON.stringify({...}),`
            j = i - 1
            found = False
            while j >= max(0, i - 10):
                prev = lines[j]
                # Match: body: JSON.stringify({ ... }),
                # The line must contain JSON.stringify and end with }),
                if "JSON.stringify" in prev and "body" in prev:
                    # Insert useTools: true before the closing }) of JSON.stringify
                    # Pattern: ...}),  →  ..., useTools: true }),
                    new_prev = re.sub(
                        r'\}\s*\)\s*,\s*$',
                        ', useTools: true }),',
                        prev.rstrip()
                    )
                    if new_prev != prev.rstrip():
                        lines[j] = new_prev
                        lines.pop(i)  # remove the misplaced useTools line
                        changed = True
                        found = True
                        # Don't increment i — we removed a line
                        break
                j -= 1

            if not found:
                # Couldn't find body line — just remove the invalid fetch option
                lines.pop(i)
                changed = True
                continue
        else:
            i += 1

    if changed:
        with open(filepath, "w") as f:
            f.write("\n".join(lines))
    return changed

fixed = []
for d in [MODAL_DIR, OSINT_DIR]:
    for fn in sorted(os.listdir(d)):
        if fn.endswith((".tsx", ".ts")):
            path = os.path.join(d, fn)
            if fix_file(path):
                fixed.append(fn)

print(f"Fixed {len(fixed)} files:")
for f in fixed:
    print(f"  ✓ {f}")
