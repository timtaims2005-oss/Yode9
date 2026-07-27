---
name: 4D Engine Architecture
description: True 4D math library and canvas rendering patterns for 4D components.
---

# 4D Engine Architecture

**Why:** Multiple components build on 4D math — must know the canonical exports and patterns.

## Core Library

`artifacts/mr7-ai/src/lib/four-d-engine.ts` exports:

- `Vec4` — [x,y,z,w] tuple type
- `Mat4x4` — 16-element flat array
- `Rotation4D` — stateful 4D rotation with `.step()`, `.apply()`, `.matrix()` methods
- `TESSERACT_VERTICES` — 16 hypercube vertices
- `TESSERACT_EDGES` — 32 edge pairs for rendering
- `project4Dto2D(vec4, cx, cy, scale)` → `{ pos: [x,y], depth: number }`

## Canvas Component Pattern

All 4D canvas components follow this pattern:
1. `getCanvasConfig()` from `adaptive-quality.ts` for DPR and particle counts
2. `useEffect` with resize + `requestAnimationFrame` loop
3. `gpu-layer` CSS class on canvas for hardware compositing
4. Cap `dpr` at 1.5 to avoid memory pressure
5. Return cleanup: `cancelAnimationFrame` + remove resize listener

## Key Components

- `HyperDimension4D` — rotating tesseract SVG renderer
- `NeuralParticleField4D` — particles + tesseract on canvas, fully GPU-accelerated
- `CyberMatrix4D` — 4D matrix rain effect
- `HolographicThreatMap` — network threat node canvas
- `QuantumNetworkTopology` — interactive network diagram

## How to apply: New 4D canvas components should use `Rotation4D` from four-d-engine.ts and follow the resize/RAF/cleanup pattern above.
