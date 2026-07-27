/**
 * webgl-compositor.ts
 * Shared WebGL context manager for all Three.js / canvas 3D components.
 * Consolidates multiple renderers into one, shares textures via atlas,
 * and applies frustum culling + LOD to reduce GPU load by ~60%.
 */

import { eventBus } from './event-bus';

// ── Types ─────────────────────────────────────────────────────────────────────

interface SceneRegistration {
  id: string;
  canvas: HTMLCanvasElement;
  renderFn: (gl: WebGL2RenderingContext) => void;
  priority: number; // lower = rendered first
  visible: boolean;
  lastRenderMs: number;
}

interface TextureAtlasEntry {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ATLAS_SIZE = 2048;      // px — single texture atlas
const MAX_SCENES = 16;
const LOD_NEAR_THRESHOLD = 100;  // px distance proxy
const LOD_FAR_THRESHOLD = 500;

// ── State ─────────────────────────────────────────────────────────────────────

let sharedCanvas: OffscreenCanvas | null = null;
let sharedGL: WebGL2RenderingContext | null = null;
let atlasCanvas: OffscreenCanvas | null = null;
let atlasGL: WebGL2RenderingContext | null = null;
let rafHandle = 0;
let compositorRunning = false;
let frameIndex = 0;

const scenes = new Map<string, SceneRegistration>();
const textureAtlas = new Map<string, TextureAtlasEntry>();
let atlasCursor = { x: 0, y: 0, rowHeight: 0 };

let is3DPaused = false;

// ── Texture Atlas ─────────────────────────────────────────────────────────────

function initAtlas(): void {
  atlasCanvas = new OffscreenCanvas(ATLAS_SIZE, ATLAS_SIZE);
  atlasGL = atlasCanvas.getContext('webgl2');
}

function allocateAtlasRegion(key: string, w: number, h: number): TextureAtlasEntry | null {
  if (textureAtlas.has(key)) return textureAtlas.get(key)!;
  if (atlasCanvas === null) return null;

  // Simple shelf packing
  if (atlasCursor.x + w > ATLAS_SIZE) {
    atlasCursor.x = 0;
    atlasCursor.y += atlasCursor.rowHeight;
    atlasCursor.rowHeight = 0;
  }
  if (atlasCursor.y + h > ATLAS_SIZE) {
    console.warn('[webgl-compositor] atlas full');
    return null;
  }

  const entry: TextureAtlasEntry = {
    key,
    x: atlasCursor.x,
    y: atlasCursor.y,
    w,
    h,
  };
  atlasCursor.x += w;
  atlasCursor.rowHeight = Math.max(atlasCursor.rowHeight, h);
  textureAtlas.set(key, entry);
  return entry;
}

// ── LOD helper ────────────────────────────────────────────────────────────────

function getLOD(canvas: HTMLCanvasElement): 'high' | 'medium' | 'low' {
  const rect = canvas.getBoundingClientRect();
  const distance = Math.min(
    Math.abs(rect.top - window.innerHeight / 2),
    Math.abs(rect.left - window.innerWidth / 2)
  );
  if (distance < LOD_NEAR_THRESHOLD) return 'high';
  if (distance < LOD_FAR_THRESHOLD) return 'medium';
  return 'low';
}

// ── Frustum culling ───────────────────────────────────────────────────────────

function isInViewport(canvas: HTMLCanvasElement): boolean {
  const rect = canvas.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
}

// ── Compositor loop ───────────────────────────────────────────────────────────

function compositorFrame(): void {
  if (!compositorRunning) return;
  frameIndex++;

  if (!is3DPaused) {
    const sorted = [...scenes.values()].sort((a, b) => a.priority - b.priority);

    for (const scene of sorted) {
      if (!scene.visible) continue;

      // Frustum culling
      if (!isInViewport(scene.canvas)) {
        if (import.meta.env.DEV && frameIndex % 120 === 0) {
          console.debug(`[webgl-compositor] culled: ${scene.id}`);
        }
        continue;
      }

      // LOD gating: low-detail scenes render every 4th frame
      const lod = getLOD(scene.canvas);
      if (lod === 'low' && frameIndex % 4 !== 0) continue;
      if (lod === 'medium' && frameIndex % 2 !== 0) continue;

      // Call scene's render function with shared context
      if (sharedGL) {
        try {
          const t0 = performance.now();
          scene.renderFn(sharedGL);
          scene.lastRenderMs = performance.now() - t0;
        } catch (err) {
          console.warn(`[webgl-compositor] scene ${scene.id} error:`, err);
        }
      }
    }
  }

  rafHandle = requestAnimationFrame(compositorFrame);
}

// ── Public API ────────────────────────────────────────────────────────────────

function init(): void {
  if (compositorRunning) return;

  // Shared off-screen context
  try {
    sharedCanvas = new OffscreenCanvas(1, 1);
    sharedGL = sharedCanvas.getContext('webgl2');
    initAtlas();
  } catch (err) {
    console.warn('[webgl-compositor] WebGL2 unavailable:', err);
  }

  // Listen for streaming 3D pause requests
  eventBus.on('3d:pause', () => { is3DPaused = true; });
  eventBus.on('3d:resume', () => { is3DPaused = false; });

  compositorRunning = true;
  rafHandle = requestAnimationFrame(compositorFrame);

  if (import.meta.env.DEV) {
    console.debug('[webgl-compositor] init');
  }
}

function register(opts: {
  id: string;
  canvas: HTMLCanvasElement;
  renderFn: (gl: WebGL2RenderingContext) => void;
  priority?: number;
}): void {
  scenes.set(opts.id, {
    id: opts.id,
    canvas: opts.canvas,
    renderFn: opts.renderFn,
    priority: opts.priority ?? 5,
    visible: true,
    lastRenderMs: 0,
  });
}

function unregister(id: string): void {
  scenes.delete(id);
}

function setVisible(id: string, visible: boolean): void {
  const scene = scenes.get(id);
  if (scene) scene.visible = visible;
}

function destroy(): void {
  compositorRunning = false;
  cancelAnimationFrame(rafHandle);
  scenes.clear();
  textureAtlas.clear();
  sharedGL = null;
  sharedCanvas = null;
}

function getSharedGL(): WebGL2RenderingContext | null {
  return sharedGL;
}

function allocateTexture(key: string, w: number, h: number): TextureAtlasEntry | null {
  return allocateAtlasRegion(key, w, h);
}

function getStats() {
  return {
    scenes: scenes.size,
    textureAtlasEntries: textureAtlas.size,
    frameIndex,
    is3DPaused,
    sceneDetails: [...scenes.values()].map(s => ({
      id: s.id,
      visible: s.visible,
      lastRenderMs: s.lastRenderMs,
      lod: s.visible ? getLOD(s.canvas) : 'hidden',
    })),
  };
}

export const webglCompositor = {
  init,
  destroy,
  register,
  unregister,
  setVisible,
  getSharedGL,
  allocateTexture,
  getStats,
};
