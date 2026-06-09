import { useCallback, useRef, useState } from "react";

/**
 * useDraggable — reliable drag for fixed-position widgets.
 *
 * Strategy: During drag we mutate DOM style directly (bypasses React 18 batching
 * which delays setPos re-renders). On mouseup / touchend we call setPos once to
 * sync React state and write to localStorage.
 *
 * Works with both mouse and touch events.
 */
export function useDraggable(
  storageKey: string,
  defaultPos: { x: number; y: number }
) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const v = localStorage.getItem(storageKey);
      if (v) return JSON.parse(v);
    } catch {}
    return defaultPos;
  });

  // Ref to the outermost widget div — we mutate its style during drag.
  const rootRef = useRef<HTMLDivElement>(null);

  const onDragMouseDown = useCallback((e: React.MouseEvent) => {
    // Ignore right-click
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const el = rootRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    // Offset from widget top-left to cursor — stays constant during drag
    const offX = e.clientX - rect.left;
    const offY = e.clientY - rect.top;

    const move = (ev: MouseEvent) => {
      ev.preventDefault();
      const nx = Math.max(0, Math.min(window.innerWidth  - rect.width  - 4, ev.clientX - offX));
      const ny = Math.max(0, Math.min(window.innerHeight - 48,              ev.clientY - offY));
      // Direct DOM mutation — no React re-render needed for smooth drag
      el.style.left = `${nx}px`;
      el.style.top  = `${ny}px`;
    };

    const up = (ev: MouseEvent) => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup",   up);
      const nx = Math.max(0, Math.min(window.innerWidth  - rect.width  - 4, ev.clientX - offX));
      const ny = Math.max(0, Math.min(window.innerHeight - 48,              ev.clientY - offY));
      const newPos = { x: nx, y: ny };
      setPos(newPos);
      try { localStorage.setItem(storageKey, JSON.stringify(newPos)); } catch {}
    };

    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup",   up);
  }, [storageKey]);

  const onDragTouchStart = useCallback((e: React.TouchEvent) => {
    e.stopPropagation();
    const el = rootRef.current;
    if (!el) return;

    const rect  = el.getBoundingClientRect();
    const t0    = e.touches[0];
    const offX  = t0.clientX - rect.left;
    const offY  = t0.clientY - rect.top;

    const move = (ev: TouchEvent) => {
      ev.preventDefault();
      const t  = ev.touches[0];
      const nx = Math.max(0, Math.min(window.innerWidth  - rect.width  - 4, t.clientX - offX));
      const ny = Math.max(0, Math.min(window.innerHeight - 48,              t.clientY - offY));
      el.style.left = `${nx}px`;
      el.style.top  = `${ny}px`;
    };

    const up = (ev: TouchEvent) => {
      document.removeEventListener("touchmove",  move);
      document.removeEventListener("touchend",   up);
      const t  = ev.changedTouches[0];
      const nx = Math.max(0, Math.min(window.innerWidth  - rect.width  - 4, t.clientX - offX));
      const ny = Math.max(0, Math.min(window.innerHeight - 48,              t.clientY - offY));
      const newPos = { x: nx, y: ny };
      setPos(newPos);
      try { localStorage.setItem(storageKey, JSON.stringify(newPos)); } catch {}
    };

    document.addEventListener("touchmove",  move, { passive: false });
    document.addEventListener("touchend",   up);
  }, [storageKey]);

  return { pos, rootRef, onDragMouseDown, onDragTouchStart };
}
