// ─────────────────────────────────────────────────────────────────────────────
//  NEXUS EXECUTOR — الطبقة الرابعة
//  ينفّذ الأوامر تلقائياً ويعرض شريط تقدم في الوقت الفعلي
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from "react";
import { NexusCore, type NexusState, type NexusActivityEntry } from "@/lib/NexusCore";
import { NEXUS_REGISTRY_MAP, CATEGORY_LABELS, type NexusDispatchers } from "@/lib/ToolRegistry";
import { parseNexusActions } from "@/lib/NexusInterceptor";

// ── Props ─────────────────────────────────────────────────────────────────────
interface NexusExecutorProps {
  dispatchers: NexusDispatchers | null;
}

// ── Hook: sync Nexus state ────────────────────────────────────────────────────
function useNexusState(): NexusState {
  const [state, setState] = useState<NexusState>(() => NexusCore.getState());
  useEffect(() => {
    return NexusCore.subscribe((s) => setState({ ...s }));
  }, []);
  return state;
}

// ── Executor Logic (singleton, called from ChatView after AI response) ────────
let _dispatchers: NexusDispatchers | null = null;

export function registerNexusDispatchers(d: NexusDispatchers) {
  _dispatchers = d;
}

export async function executeNexusResponse(responseText: string): Promise<void> {
  if (!_dispatchers) return;
  const actions = parseNexusActions(responseText);
  if (actions.length === 0) return;

  const queue = actions.map((a) => {
    const tool = NEXUS_REGISTRY_MAP.get(a.action);
    return {
      actionId: a.action,
      label: tool?.nameAr ?? a.action,
      params: a.params,
    };
  });

  NexusCore.startExecution(queue);

  for (const item of queue) {
    const tool = NEXUS_REGISTRY_MAP.get(item.actionId);
    if (!tool || !_dispatchers) {
      NexusCore.advanceExecution({
        actionId: item.actionId,
        success: false,
        message: `أمر غير معروف: ${item.actionId}`,
      });
      continue;
    }

    // Small delay between actions for visual effect
    await new Promise<void>((r) => setTimeout(r, 220));

    try {
      const result = tool.execute(item.params ?? {}, _dispatchers);
      NexusCore.advanceExecution({
        actionId: result.actionId,
        success: result.success,
        message: result.messageAr,
      });
    } catch (err) {
      NexusCore.advanceExecution({
        actionId: item.actionId,
        success: false,
        message: `خطأ: ${err instanceof Error ? err.message : "فشل التنفيذ"}`,
      });
    }
  }

  await new Promise<void>((r) => setTimeout(r, 400));
  NexusCore.finishExecution();
}

// ── Progress Bar Component ────────────────────────────────────────────────────
function NexusProgressBar({ current, total }: { current: number; total: number }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #00ff88, #00e5ff)",
          boxShadow: "0 0 8px #00ff8880",
        }}
      />
    </div>
  );
}

// ── Activity Log Entry ────────────────────────────────────────────────────────
function ActivityEntry({ entry }: { entry: NexusActivityEntry }) {
  const age = Date.now() - entry.ts;
  const timeLabel = age < 60000 ? "الآن" : `${Math.floor(age / 60000)}د`;
  return (
    <div className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs mt-0.5 flex-shrink-0">
        {entry.success ? "✅" : "❌"}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-white/90 font-medium truncate">{entry.actionLabel}</p>
        <p className="text-xs text-white/50 truncate">{entry.message}</p>
      </div>
      <span className="text-xs text-white/30 flex-shrink-0">{timeLabel}</span>
    </div>
  );
}

// ── Main HUD Component ────────────────────────────────────────────────────────
export function NexusExecutorHUD({ dispatchers }: NexusExecutorProps) {
  const state = useNexusState();

  useEffect(() => {
    if (dispatchers) registerNexusDispatchers(dispatchers);
  }, [dispatchers]);

  // Listen for AI responses to execute
  useEffect(() => {
    function onAiResponse(e: Event) {
      const { text } = (e as CustomEvent<{ text: string }>).detail;
      executeNexusResponse(text).catch(console.error);
    }
    window.addEventListener("nexus:ai-response", onAiResponse);
    return () => window.removeEventListener("nexus:ai-response", onAiResponse);
  }, []);

  if (!state.enabled) return null;

  const { executionState, activityLog, showHUD, showActivityLog } = state;

  return (
    <>
      {/* ── Execution Progress Overlay ─────────────────────────────────── */}
      {executionState.running && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] w-80 rounded-xl border"
          style={{
            background: "rgba(0,10,20,0.92)",
            borderColor: "#00ff8840",
            boxShadow: "0 0 24px #00ff8820, 0 4px 24px #00000080",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-emerald-400 tracking-widest animate-pulse">
                ⚡ NEXUS يُنفِّذ
              </span>
              <span className="ml-auto text-xs text-white/40">
                {executionState.currentIndex}/{executionState.total}
              </span>
            </div>
            <NexusProgressBar
              current={executionState.currentIndex}
              total={executionState.total}
            />
            {executionState.current && (
              <p className="mt-2 text-xs text-cyan-300/80 truncate">
                ▶{" "}
                {executionState.queue[executionState.currentIndex]?.label ??
                  executionState.current}
              </p>
            )}
            {/* Recent results */}
            <div className="mt-2 space-y-1">
              {executionState.results.slice(-2).map((r, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs">
                  <span>{r.success ? "✓" : "✗"}</span>
                  <span className={r.success ? "text-emerald-400/70" : "text-red-400/70"}>
                    {r.message}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── NEXUS HUD Badge ───────────────────────────────────────────── */}
      {showHUD && (
        <div
          className="fixed bottom-6 right-6 z-[9990] flex flex-col items-end gap-2"
        >
          {/* Activity Log Panel */}
          {showActivityLog && activityLog.length > 0 && (
            <div
              className="w-72 max-h-64 rounded-xl border overflow-hidden flex flex-col"
              style={{
                background: "rgba(0,8,18,0.95)",
                borderColor: "#00ff8830",
                boxShadow: "0 0 20px #00ff8815",
                backdropFilter: "blur(16px)",
              }}
            >
              <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
                <span className="text-xs font-bold text-emerald-400 tracking-wider">
                  سجل NEXUS
                </span>
                <button
                  onClick={() => NexusCore.clearLog()}
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  مسح
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-1 scrollbar-thin">
                {activityLog.map((entry) => (
                  <ActivityEntry key={entry.id} entry={entry} />
                ))}
              </div>
            </div>
          )}

          {/* Main Badge */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => NexusCore.toggleActivityLog()}
              className="flex items-center gap-2 px-3 py-2 rounded-l-xl border-y border-l transition-all duration-200 hover:scale-105 active:scale-95"
              style={{
                background: executionState.running
                  ? "rgba(0,255,136,0.12)"
                  : "rgba(0,10,20,0.85)",
                borderColor: executionState.running ? "#00ff88" : "#00ff8840",
                boxShadow: executionState.running
                  ? "0 0 16px #00ff8840"
                  : "0 0 8px #00ff8815",
                backdropFilter: "blur(12px)",
              }}
            >
              <span
                className={`text-xs font-bold tracking-widest ${
                  executionState.running
                    ? "text-emerald-400 animate-pulse"
                    : "text-emerald-400/60"
                }`}
              >
                NEXUS
              </span>
              {activityLog.length > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full font-bold"
                  style={{
                    background: "#00ff8820",
                    color: "#00ff88",
                    fontSize: "10px",
                  }}
                >
                  {activityLog.length}
                </span>
              )}
              {executionState.running && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("nexus:open-panel"))}
              className="flex items-center justify-center w-8 h-[38px] rounded-r-xl border-y border-r transition-all duration-200 hover:bg-emerald-400/10 active:scale-95"
              title="فتح لوحة NEXUS الكاملة (Ctrl+Shift+N)"
              style={{
                background: "rgba(0,10,20,0.85)",
                borderColor: "#00ff8840",
                backdropFilter: "blur(12px)",
              }}
            >
              <span className="text-emerald-400/60 text-xs">⊞</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Category Badge ────────────────────────────────────────────────────────────
export function NexusCategoryBadge({ category }: { category: string }) {
  const label = CATEGORY_LABELS[category] ?? category;
  const colors: Record<string, string> = {
    security: "#ff4444",
    osint: "#ff8800",
    modal: "#0088ff",
    persona: "#aa44ff",
    theme: "#ff44aa",
    model: "#44ffaa",
    ui: "#4488ff",
    system: "#888888",
    chat: "#ffaa00",
    arsenal: "#ff2200",
  };
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded font-mono"
      style={{
        background: `${colors[category] ?? "#888888"}20`,
        color: colors[category] ?? "#888888",
        border: `1px solid ${colors[category] ?? "#888888"}40`,
        fontSize: "9px",
      }}
    >
      {label}
    </span>
  );
}
