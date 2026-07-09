/**
 * Virtual List Engine — renders only visible items in a scroll container.
 * Reduces DOM nodes from O(n) to O(visible) — critical for long chats.
 * Supports variable item heights via measurement cache.
 */

import { useRef, useState, useEffect, useCallback, useMemo } from "react";

interface VirtualListOptions {
  itemCount: number;
  estimatedItemHeight: number;
  containerHeight: number;
  overscan?: number; // extra items above/below viewport
  scrollTopRef?: React.MutableRefObject<number>;
}

interface VirtualItem {
  index: number;
  top: number;
  height: number;
  isVisible: boolean;
}

interface VirtualListState {
  visibleItems: VirtualItem[];
  totalHeight: number;
  offsetTop: number;
  startIndex: number;
  endIndex: number;
}

const DEFAULT_OVERSCAN = 3;

export function useVirtualList({
  itemCount,
  estimatedItemHeight,
  containerHeight,
  overscan = DEFAULT_OVERSCAN,
}: VirtualListOptions): {
  state: VirtualListState;
  containerRef: React.RefObject<HTMLDivElement>;
  getItemStyle: (index: number) => React.CSSProperties;
  measureItem: (index: number, el: HTMLElement | null) => void;
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
} {
  const containerRef = useRef<HTMLDivElement>(null!);
  const heightCache = useRef<Map<number, number>>(new Map());
  const offsetCache = useRef<Map<number, number>>(new Map());
  const [scrollTop, setScrollTop] = useState(0);

  // Invalidate offset cache when heights change
  const invalidateOffsets = useCallback((fromIndex: number) => {
    for (const key of offsetCache.current.keys()) {
      if (key >= fromIndex) offsetCache.current.delete(key);
    }
  }, []);

  const getItemHeight = useCallback((index: number): number => {
    return heightCache.current.get(index) ?? estimatedItemHeight;
  }, [estimatedItemHeight]);

  const getItemOffset = useCallback((index: number): number => {
    if (offsetCache.current.has(index)) return offsetCache.current.get(index)!;
    let offset = 0;
    for (let i = 0; i < index; i++) offset += getItemHeight(i);
    offsetCache.current.set(index, offset);
    return offset;
  }, [getItemHeight]);

  const totalHeight = useMemo(() => {
    let h = 0;
    for (let i = 0; i < itemCount; i++) h += getItemHeight(i);
    return h;
  }, [itemCount, getItemHeight]);

  const state = useMemo((): VirtualListState => {
    if (itemCount === 0) return { visibleItems: [], totalHeight: 0, offsetTop: 0, startIndex: 0, endIndex: 0 };

    // Binary search for start index
    let start = 0;
    let end = itemCount - 1;
    while (start < end) {
      const mid = Math.floor((start + end) / 2);
      if (getItemOffset(mid) < scrollTop) start = mid + 1;
      else end = mid;
    }
    const startIndex = Math.max(0, start - overscan);
    const endScrollTop = scrollTop + containerHeight;

    let current = startIndex;
    while (current < itemCount && getItemOffset(current) < endScrollTop) current++;
    const endIndex = Math.min(itemCount - 1, current + overscan);

    const visibleItems: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({
        index: i,
        top: getItemOffset(i),
        height: getItemHeight(i),
        isVisible: getItemOffset(i) >= scrollTop && getItemOffset(i) < endScrollTop,
      });
    }

    return {
      visibleItems,
      totalHeight,
      offsetTop: getItemOffset(startIndex),
      startIndex,
      endIndex,
    };
  }, [scrollTop, itemCount, containerHeight, overscan, totalHeight, getItemOffset, getItemHeight]);

  // Scroll listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const measureItem = useCallback((index: number, el: HTMLElement | null) => {
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    if (heightCache.current.get(index) !== h) {
      heightCache.current.set(index, h);
      invalidateOffsets(index);
    }
  }, [invalidateOffsets]);

  const getItemStyle = useCallback((index: number): React.CSSProperties => ({
    position: "absolute",
    top: getItemOffset(index),
    left: 0,
    right: 0,
    minHeight: getItemHeight(index),
  }), [getItemOffset, getItemHeight]);

  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = "smooth") => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ top: getItemOffset(index), behavior });
  }, [getItemOffset]);

  return { state, containerRef, getItemStyle, measureItem, scrollToIndex };
}
