/**
 * useHoverPrefetch — React hook for hover-intent modal preloading.
 * Returns event handlers to spread onto trigger elements.
 */
import { useCallback } from "react";
import { smartHoverPrefetch } from "@/lib/smart-hover-prefetch";

export function useHoverPrefetch(id: string, loader: () => Promise<unknown>) {
  smartHoverPrefetch.register(id, loader);

  const onMouseEnter = useCallback(() => {
    smartHoverPrefetch.onHoverStart(id);
  }, [id]);

  const onMouseLeave = useCallback(() => {
    smartHoverPrefetch.onHoverEnd(id);
  }, [id]);

  const onFocus = useCallback(() => {
    smartHoverPrefetch.onHoverStart(id);
  }, [id]);

  const onBlur = useCallback(() => {
    smartHoverPrefetch.onHoverEnd(id);
  }, [id]);

  const onOpen = useCallback(() => {
    smartHoverPrefetch.onOpen(id);
  }, [id]);

  return { onMouseEnter, onMouseLeave, onFocus, onBlur, onOpen };
}
