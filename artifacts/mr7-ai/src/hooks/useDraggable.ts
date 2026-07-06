import { useCallback, useEffect, useRef, useState } from "react";

const GRID = 1; // no grid snapping — pixel-perfect

export const RESET_ALL_POSITIONS_EVENT = "mr7:reset-all-draggable-positions";

export function resetAllDraggablePositions() {
  window.dispatchEvent(new CustomEvent(RESET_ALL_POSITIONS_EVENT));
}

const LOCK_KEY = "mr7-windows-locked";
export const LOCK_CHANGED_EVENT = "mr7:draggable-lock-changed";

export function isDraggableLocked(): boolean {
  try { return localStorage.getItem(LOCK_KEY) === "1"; } catch { return false; }
}

export function setDraggableLocked(locked: boolean) {
  try { localStorage.setItem(LOCK_KEY, locked ? "1" : "0"); } catch {}
  window.dispatchEvent(new CustomEvent(LOCK_CHANGED_EVENT, { detail: { locked } }));
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/**
 * RAF-based drag hook. Mutates DOM directly during drag for zero-jank movement.
 * Commits React state only on mouseup/touchend for persistence.
 */
export function useDraggable(
  storageKey: string,
  defaultPos: { x: number; y: number } = { x: 40, y: 80 }
) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v) {
        const p = JSON.parse(v);
        if (typeof p.x === "number" && typeof p.y === "number") return p;
      }
    } catch {}
    return defaultPos;
  });

  const [locked, setLocked] = useState<boolean>(() => isDraggableLocked());

  const rootRef  = useRef<HTMLDivElement>(null);
  const rafRef   = useRef(0);
  const activeRef = useRef(false);
  const targetRef = useRef({ x: pos.x, y: pos.y });
  const offsetRef = useRef({ x: 0, y: 0 });

  // Sync target when pos changes externally
  useEffect(() => {
    targetRef.current = { x: pos.x, y: pos.y };
  }, [pos]);

  // Listen for global lock toggle
  useEffect(() => {
    const h = (e: Event) => setLocked((e as CustomEvent).detail?.locked ?? isDraggableLocked());
    window.addEventListener(LOCK_CHANGED_EVENT, h);
    return () => window.removeEventListener(LOCK_CHANGED_EVENT, h);
  }, []);

  const commit = useCallback((x: number, y: number) => {
    const el = rootRef.current;
    if (!el) return;
    const w  = el.offsetWidth;
    const cx = clamp(x, 0, window.innerWidth  - w - 2);
    const cy = clamp(y, 0, window.innerHeight - 48);
    el.style.left = `${cx}px`;
    el.style.top  = `${cy}px`;
    const p = { x: cx, y: cy };
    setPos(p);
    try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch {}
  }, [storageKey]);

  const resetPos = useCallback(() => {
    try { localStorage.removeItem(storageKey); } catch {}
    const el = rootRef.current;
    const w  = el?.offsetWidth ?? 0;
    const cx = clamp(defaultPos.x, 0, window.innerWidth  - w - 2);
    const cy = clamp(defaultPos.y, 0, window.innerHeight - 48);
    if (el) { el.style.left = `${cx}px`; el.style.top = `${cy}px`; }
    setPos({ x: cx, y: cy });
  }, [storageKey, defaultPos.x, defaultPos.y]);

  const onDragMouseDown = useCallback((e: React.MouseEvent) => {
    if (locked) return;
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    e.stopPropagation();
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    offsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    activeRef.current = true;

    // Set cursor on body during drag
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";

    const move = (ev: MouseEvent) => {
      if (!activeRef.current) return;
      const el2 = rootRef.current;
      if (!el2) return;
      const w  = el2.offsetWidth;
      const nx = clamp(ev.clientX - offsetRef.current.x, 0, window.innerWidth  - w - 2);
      const ny = clamp(ev.clientY - offsetRef.current.y, 0, window.innerHeight - 48);
      el2.style.left = `${nx}px`;
      el2.style.top  = `${ny}px`;
      targetRef.current = { x: nx, y: ny };
    };

    const up = (ev: MouseEvent) => {
      activeRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup",   up);
      const el2 = rootRef.current;
      if (!el2) return;
      const w  = el2.offsetWidth;
      const nx = clamp(ev.clientX - offsetRef.current.x, 0, window.innerWidth  - w - 2);
      const ny = clamp(ev.clientY - offsetRef.current.y, 0, window.innerHeight - 48);
      commit(nx, ny);
    };

    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("mouseup",   up);
  }, [commit, locked]);

  const onDragTouchStart = useCallback((e: React.TouchEvent) => {
    if (locked) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.stopPropagation();
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const t0   = e.touches[0];
    offsetRef.current = { x: t0.clientX - rect.left, y: t0.clientY - rect.top };
    activeRef.current = true;

    const move = (ev: TouchEvent) => {
      if (!activeRef.current) return;
      const el2 = rootRef.current;
      if (!el2) return;
      const t  = ev.touches[0];
      const w  = el2.offsetWidth;
      const nx = clamp(t.clientX - offsetRef.current.x, 0, window.innerWidth  - w - 2);
      const ny = clamp(t.clientY - offsetRef.current.y, 0, window.innerHeight - 48);
      el2.style.left = `${nx}px`;
      el2.style.top  = `${ny}px`;
      targetRef.current = { x: nx, y: ny };
    };

    const up = (ev: TouchEvent) => {
      activeRef.current = false;
      document.removeEventListener("touchmove",  move);
      document.removeEventListener("touchend",   up);
      const el2 = rootRef.current;
      if (!el2) return;
      const t  = ev.changedTouches[0];
      const w  = el2.offsetWidth;
      const nx = clamp(t.clientX - offsetRef.current.x, 0, window.innerWidth  - w - 2);
      const ny = clamp(t.clientY - offsetRef.current.y, 0, window.innerHeight - 48);
      commit(nx, ny);
    };

    document.addEventListener("touchmove",  move, { passive: true });
    document.addEventListener("touchend",   up);
  }, [commit, locked]);

  // Re-clamp persisted position to the current viewport on mount. A position
  // saved on a different screen size (or window resize since last save) can
  // otherwise leave the panel rendered fully off-screen — visually "not
  // appearing" even though its open state toggled correctly.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const w = el.offsetWidth || 0;
    const h = el.offsetHeight || 0;
    const cx = clamp(pos.x, 0, Math.max(0, window.innerWidth - w - 2));
    const cy = clamp(pos.y, 0, Math.max(0, window.innerHeight - Math.min(h, 48)));
    if (cx !== pos.x || cy !== pos.y) {
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      const p = { x: cx, y: cy };
      setPos(p);
      try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup RAF on unmount
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  // Listen for global "reset all" broadcast
  useEffect(() => {
    const h = () => resetPos();
    window.addEventListener(RESET_ALL_POSITIONS_EVENT, h);
    return () => window.removeEventListener(RESET_ALL_POSITIONS_EVENT, h);
  }, [resetPos]);

  return { pos, rootRef, onDragMouseDown, onDragTouchStart, resetPos, locked };
}
