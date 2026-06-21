import { useRef, useState, useCallback, useEffect } from "react";

export interface StreamMetrics {
  tps: number;
  peakTps: number;
  tokenCount: number;
  elapsedMs: number;
  ttft: number | null;
  bytesReceived: number;
  isStreaming: boolean;
  quality: "idle" | "slow" | "normal" | "fast" | "ultra";
  history: number[];
}

const INITIAL: StreamMetrics = {
  tps: 0, peakTps: 0, tokenCount: 0, elapsedMs: 0,
  ttft: null, bytesReceived: 0, isStreaming: false,
  quality: "idle", history: [],
};

function classifyQuality(tps: number): StreamMetrics["quality"] {
  if (tps === 0)   return "idle";
  if (tps < 5)     return "slow";
  if (tps < 15)    return "normal";
  if (tps < 30)    return "fast";
  return "ultra";
}

export function useStreamMetrics() {
  const [metrics, setMetrics] = useState<StreamMetrics>(INITIAL);

  const startTimeRef    = useRef<number | null>(null);
  const firstTokenRef   = useRef<boolean>(true);
  const tokenCountRef   = useRef(0);
  const bytesRef        = useRef(0);
  const peakTpsRef      = useRef(0);
  const tpsWindowRef    = useRef<{ ts: number; tokens: number }[]>([]);
  const historyRef      = useRef<number[]>(Array(60).fill(0));
  const histTimerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef          = useRef<number>(0);
  const isStreamingRef  = useRef(false);

  const computeLiveTps = useCallback((): number => {
    const now = Date.now();
    const cutoff = now - 3000;
    tpsWindowRef.current = tpsWindowRef.current.filter(e => e.ts >= cutoff);
    if (tpsWindowRef.current.length < 2) return 0;
    const totalTok = tpsWindowRef.current.reduce((s, e) => s + e.tokens, 0);
    const spanMs   = tpsWindowRef.current[tpsWindowRef.current.length - 1].ts - tpsWindowRef.current[0].ts;
    return spanMs > 0 ? Math.round((totalTok / spanMs) * 1000) : 0;
  }, []);

  const tick = useCallback(() => {
    if (!isStreamingRef.current) return;
    const tps = computeLiveTps();
    if (tps > peakTpsRef.current) peakTpsRef.current = tps;
    const elapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
    setMetrics(prev => ({
      ...prev,
      tps,
      peakTps: peakTpsRef.current,
      tokenCount: tokenCountRef.current,
      bytesReceived: bytesRef.current,
      elapsedMs: elapsed,
      quality: classifyQuality(tps),
      history: historyRef.current.slice(),
    }));
    rafRef.current = requestAnimationFrame(tick);
  }, [computeLiveTps]);

  const startStream = useCallback(() => {
    startTimeRef.current  = Date.now();
    firstTokenRef.current = true;
    tokenCountRef.current = 0;
    bytesRef.current      = 0;
    peakTpsRef.current    = 0;
    tpsWindowRef.current  = [];
    historyRef.current    = Array(60).fill(0);
    isStreamingRef.current = true;
    setMetrics({ ...INITIAL, isStreaming: true });

    histTimerRef.current = setInterval(() => {
      const tps = computeLiveTps();
      historyRef.current.push(tps);
      if (historyRef.current.length > 60) historyRef.current.shift();
    }, 500);

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick, computeLiveTps]);

  const recordChunk = useCallback((content: string, explicitTokens?: number) => {
    const tokens = explicitTokens ?? Math.max(1, Math.ceil(content.split(/\s+/).filter(Boolean).length));
    const bytes  = new TextEncoder().encode(content).length;
    tokenCountRef.current += tokens;
    bytesRef.current      += bytes;
    tpsWindowRef.current.push({ ts: Date.now(), tokens });

    if (firstTokenRef.current && startTimeRef.current) {
      firstTokenRef.current = false;
      const ttft = Date.now() - startTimeRef.current;
      setMetrics(prev => ({ ...prev, ttft }));
    }
  }, []);

  const stopStream = useCallback(() => {
    isStreamingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (histTimerRef.current) clearInterval(histTimerRef.current);

    const finalTps     = computeLiveTps();
    const finalElapsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;

    setMetrics(prev => ({
      ...prev,
      tps: finalTps,
      peakTps: peakTpsRef.current,
      tokenCount: tokenCountRef.current,
      bytesReceived: bytesRef.current,
      elapsedMs: finalElapsed,
      isStreaming: false,
      quality: classifyQuality(finalTps),
    }));
  }, [computeLiveTps]);

  const reset = useCallback(() => {
    isStreamingRef.current = false;
    cancelAnimationFrame(rafRef.current);
    if (histTimerRef.current) clearInterval(histTimerRef.current);
    startTimeRef.current  = null;
    firstTokenRef.current = true;
    tokenCountRef.current = 0;
    bytesRef.current      = 0;
    peakTpsRef.current    = 0;
    tpsWindowRef.current  = [];
    historyRef.current    = Array(60).fill(0);
    setMetrics(INITIAL);
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    if (histTimerRef.current) clearInterval(histTimerRef.current);
  }, []);

  return { metrics, startStream, recordChunk, stopStream, reset };
}
