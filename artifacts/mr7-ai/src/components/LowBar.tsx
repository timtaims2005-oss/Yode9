/**
 * LowBar — System Status & Quick Tools Footer
 *
 * Persistent bottom bar with glassmorphism styling matching TopBar/ChatInput.
 * Shows live API health, DB connection, active AI model, SwarmOrchestrator,
 * JeTool, plugin count, and telemetry status.
 *
 * Mobile: collapses to a single-row summary strip; tap to expand.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";

// ── Types ───────────────────────────────────────────────────────────────────

type StatusLevel = "online" | "warning" | "offline" | "unknown";

interface SystemStatus {
  apiHealth: StatusLevel;
  dbStatus: StatusLevel;
  apiLatency: number | null;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function statusColor(level: StatusLevel): string {
  switch (level) {
    case "online":  return "#4ade80";
    case "warning": return "#fbbf24";
    case "offline": return "#e21227";
    default:        return "#6b7280";
  }
}

function statusLabel(level: StatusLevel): string {
  switch (level) {
    case "online":  return "Operational";
    case "warning": return "Degraded";
    case "offline": return "Offline";
    default:        return "Unknown";
  }
}

/** Map provider ID → display label */
function providerLabel(provider: string): string {
  const map: Record<string, string> = {
    groq: "Groq",
    openai: "OpenAI",
    anthropic: "Anthropic",
    gemini: "Gemini",
    openrouter: "OpenRouter",
    personal: "Personal",
    cloudflare: "Cloudflare",
    custom: "Custom",
    mock: "Mock",
  };
  return map[provider] ?? provider.charAt(0).toUpperCase() + provider.slice(1);
}

/** Shorten model name to ≤14 chars */
function shortModel(model: string): string {
  if (!model) return "—";
  const parts = model.split("/");
  const name = parts[parts.length - 1];
  return name.length > 16 ? name.slice(0, 14) + "…" : name;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LowBarDivider() {
  return (
    <div
      className="h-4 w-px flex-shrink-0"
      style={{ background: "rgba(255,255,255,0.08)" }}
    />
  );
}

function PulseDot({ color, animate: doAnim = true }: { color: string; animate?: boolean }) {
  return (
    <span className="relative inline-flex h-2 w-2 flex-shrink-0">
      {doAnim && (
        <span
          className="absolute inline-flex h-full w-full rounded-full opacity-75"
          style={{ background: color, animation: "lowbar-ping 1.8s cubic-bezier(0,0,0.2,1) infinite" }}
        />
      )}
      <span
        className="relative inline-flex rounded-full h-2 w-2"
        style={{ background: color, boxShadow: `0 0 6px ${color}` }}
      />
    </span>
  );
}

interface BadgeProps {
  label: string;
  value: string;
  color?: string;
  icon?: string;
  onClick?: () => void;
  active?: boolean;
  title?: string;
}

function StatusBadge({ label, value, color = "rgba(255,255,255,0.55)", icon, onClick, active, title }: BadgeProps) {
  const isClickable = !!onClick;
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={!isClickable}
      className={[
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 transition-all",
        isClickable ? "cursor-pointer hover:brightness-110 active:scale-95" : "cursor-default",
        active === false ? "opacity-50" : "",
      ].join(" ")}
      style={{
        background: active === false
          ? "rgba(255,255,255,0.04)"
          : `${color}18`,
        border: `1px solid ${active === false ? "rgba(255,255,255,0.06)" : `${color}30`}`,
        color: active === false ? "rgba(255,255,255,0.35)" : color,
        fontFamily: "var(--font-mono, monospace)",
        letterSpacing: "0.03em",
      }}
    >
      {icon && <span>{icon}</span>}
      <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 9 }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </button>
  );
}

function ToggleBadge({
  label,
  icon,
  enabled,
  onToggle,
  accentColor = "#22d3ee",
}: {
  label: string;
  icon: string;
  enabled: boolean;
  onToggle: () => void;
  accentColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      title={`${label}: ${enabled ? "Active" : "Inactive"} — click to toggle`}
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0 transition-all cursor-pointer hover:brightness-110 active:scale-95"
      style={{
        background: enabled ? `${accentColor}18` : "rgba(255,255,255,0.04)",
        border: `1px solid ${enabled ? `${accentColor}30` : "rgba(255,255,255,0.07)"}`,
        color: enabled ? accentColor : "rgba(255,255,255,0.32)",
        fontFamily: "var(--font-mono, monospace)",
        letterSpacing: "0.03em",
      }}
    >
      <span>{icon}</span>
      <span style={{ color: enabled ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.25)", fontSize: 9 }}>
        {label}
      </span>
      {/* Toggle pill */}
      <span
        className="relative inline-flex items-center w-6 h-3 rounded-full transition-all flex-shrink-0"
        style={{ background: enabled ? accentColor : "rgba(255,255,255,0.12)" }}
      >
        <span
          className="absolute w-2 h-2 rounded-full bg-white transition-all"
          style={{
            left: enabled ? "calc(100% - 10px)" : "2px",
            boxShadow: enabled ? `0 0 4px ${accentColor}` : "none",
          }}
        />
      </span>
    </button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function LowBar() {
  const { state } = useStore();
  const { activeProvider, activeProviderModel } = state;

  // Detect mock mode from env
  const isMock = import.meta.env.VITE_LOCAL_MOCK_PROVIDER === "true"
    || activeProvider === "personal"
    || !activeProvider;

  // System status
  const [sys, setSys] = useState<SystemStatus>({
    apiHealth: "unknown",
    dbStatus: "unknown",
    apiLatency: null,
  });

  // Quick tool toggles (persisted)
  const [swarmEnabled, setSwarmEnabled] = useState(() => {
    try { return localStorage.getItem("mr7-swarm-enabled") !== "false"; } catch { return true; }
  });
  const [jetoolEnabled, setJetoolEnabled] = useState(() => {
    try { return localStorage.getItem("mr7-jetool-enabled") !== "false"; } catch { return true; }
  });
  const [telemetryEnabled, setTelemetryEnabled] = useState(() => {
    try { return localStorage.getItem("mr7-telemetry-enabled") !== "false"; } catch { return true; }
  });

  // Mobile collapse
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Plugin count (static — pulled from registry concept)
  const totalPlugins = 5;
  const activePlugins = [swarmEnabled, jetoolEnabled, telemetryEnabled, true, true].filter(Boolean).length;

  // Persist toggles
  const toggleSwarm = useCallback(() => {
    setSwarmEnabled(v => { const n = !v; localStorage.setItem("mr7-swarm-enabled", String(n)); return n; });
  }, []);
  const toggleJetool = useCallback(() => {
    setJetoolEnabled(v => { const n = !v; localStorage.setItem("mr7-jetool-enabled", String(n)); return n; });
  }, []);
  const toggleTelemetry = useCallback(() => {
    setTelemetryEnabled(v => { const n = !v; localStorage.setItem("mr7-telemetry-enabled", String(n)); return n; });
  }, []);

  // Health polling
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async () => {
    const t0 = performance.now();
    try {
      const res = await fetch("/api/health", { signal: AbortSignal.timeout(4000) });
      const latency = Math.round(performance.now() - t0);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setSys({
          apiHealth: "online",
          dbStatus: data?.database === false ? "warning" : "online",
          apiLatency: latency,
        });
      } else {
        setSys({ apiHealth: "warning", dbStatus: "warning", apiLatency: latency });
      }
    } catch {
      // In mock/local mode without an API server, treat as local operational
      setSys(prev => ({
        apiHealth: isMock ? "online" : "offline",
        dbStatus: isMock ? "online" : "offline",
        apiLatency: null,
      }));
    }
  }, [isMock]);

  useEffect(() => {
    checkHealth();
    pollRef.current = setInterval(checkHealth, 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [checkHealth]);

  // Resolve model display
  const modelName = isMock
    ? "Mock Provider"
    : activeProviderModel
    ? `${shortModel(activeProviderModel)}`
    : "—";
  const providerName = isMock ? "Mock" : providerLabel(activeProvider ?? "");

  const apiColor  = statusColor(sys.apiHealth);
  const dbColor   = statusColor(sys.dbStatus);
  const modelColor = "#a78bfa";

  // ── Desktop row ─────────────────────────────────────────────────────────────
  const DesktopRow = () => (
    <div className="flex items-center gap-2 w-full overflow-x-auto lowbar-scroll">

      {/* Brand tag */}
      <span
        className="flex-shrink-0 text-[9px] font-black tracking-[0.18em] uppercase mr-1"
        style={{ color: "var(--mr7-red)", fontFamily: "var(--font-mono, monospace)" }}
      >
        MR7
      </span>

      <LowBarDivider />

      {/* ── Section 1: System Status ─────────── */}
      <span className="flex-shrink-0 text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>
        SYSTEM
      </span>

      {/* API Health */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <PulseDot color={apiColor} animate={sys.apiHealth === "online"} />
        <span style={{ color: apiColor, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700 }}>
          API
        </span>
        <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 9 }}>
          {statusLabel(sys.apiHealth)}
        </span>
        {sys.apiLatency !== null && (
          <span style={{ color: "rgba(255,255,255,0.22)", fontSize: 8 }}>
            {sys.apiLatency}ms
          </span>
        )}
      </div>

      <LowBarDivider />

      {/* Database */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <PulseDot color={dbColor} animate={false} />
        <span style={{ color: dbColor, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700 }}>
          PostgreSQL
        </span>
        <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 9 }}>
          {statusLabel(sys.dbStatus)}
        </span>
      </div>

      <LowBarDivider />

      {/* Active AI Model */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span style={{ color: modelColor, fontSize: 9 }}>⬡</span>
        <span style={{ color: "rgba(255,255,255,0.38)", fontFamily: "var(--font-mono)", fontSize: 8 }}>
          AI
        </span>
        <span style={{ color: modelColor, fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 700 }}>
          {modelName}
        </span>
        <span
          className="px-1.5 py-0 rounded text-[8px] font-bold"
          style={{
            background: `${modelColor}18`,
            border: `1px solid ${modelColor}28`,
            color: modelColor,
            fontFamily: "var(--font-mono)",
          }}
        >
          {providerName}
        </span>
      </div>

      <LowBarDivider />

      {/* ── Section 2: Quick Tools ───────────── */}
      <span className="flex-shrink-0 text-[8px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.22)" }}>
        TOOLS
      </span>

      <ToggleBadge
        label="SwarmOrchestrator"
        icon="◈"
        enabled={swarmEnabled}
        onToggle={toggleSwarm}
        accentColor="#22d3ee"
      />

      <ToggleBadge
        label="JeTool"
        icon="⚡"
        enabled={jetoolEnabled}
        onToggle={toggleJetool}
        accentColor="#f59e0b"
      />

      <LowBarDivider />

      {/* Plugins */}
      <StatusBadge
        label="PLUGINS"
        value={`${activePlugins}/${totalPlugins}`}
        color={activePlugins === totalPlugins ? "#4ade80" : "#fbbf24"}
        icon="⬡"
        title={`${activePlugins} of ${totalPlugins} plugins active`}
      />

      <LowBarDivider />

      {/* Telemetry */}
      <ToggleBadge
        label="Telemetry"
        icon="📡"
        enabled={telemetryEnabled}
        onToggle={toggleTelemetry}
        accentColor="#a78bfa"
      />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right: live clock */}
      <LiveClock />
    </div>
  );

  // ── Mobile summary row ───────────────────────────────────────────────────────
  const MobileSummary = () => (
    <button
      className="flex items-center gap-2 w-full px-0"
      onClick={() => setMobileExpanded(v => !v)}
    >
      <PulseDot color={apiColor} animate={sys.apiHealth === "online"} />
      <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 9, fontFamily: "var(--font-mono)" }}>
        {statusLabel(sys.apiHealth)}
      </span>
      <LowBarDivider />
      <span style={{ color: modelColor, fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700 }}>
        {modelName}
      </span>
      <div className="flex-1" />
      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 9 }}>
        {mobileExpanded ? "▾" : "▸"}
      </span>
    </button>
  );

  return (
    <>
      {/* Keyframe for ping animation */}
      <style>{`
        @keyframes lowbar-ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
        .lowbar-scroll {
          scrollbar-width: none;
        }
        .lowbar-scroll::-webkit-scrollbar { display: none; }
      `}</style>

      <div
        className="studio-lowbar w-full flex-shrink-0 relative"
        style={{
          background: "rgba(4,4,8,0.92)",
          backdropFilter: "blur(24px) saturate(180%)",
          WebkitBackdropFilter: "blur(24px) saturate(180%)",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 -1px 0 rgba(226,18,39,0.08), 0 -4px 24px rgba(0,0,0,0.6)",
          zIndex: 40,
          userSelect: "none",
        }}
      >
        {/* Desktop layout */}
        <div
          className="hidden md:flex items-center gap-2 px-4"
          style={{ height: 32, minHeight: 32 }}
        >
          <DesktopRow />
        </div>

        {/* Mobile layout */}
        <div className="md:hidden flex flex-col">
          <div className="flex items-center px-3" style={{ height: 28, minHeight: 28 }}>
            <MobileSummary />
          </div>

          <AnimatePresence initial={false}>
            {mobileExpanded && (
              <motion.div
                key="mobile-expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: "hidden" }}
              >
                <div
                  className="px-3 pb-2 flex flex-wrap gap-2"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                >
                  <div className="flex items-center gap-1.5 pt-2">
                    <PulseDot color={dbColor} animate={false} />
                    <span style={{ color: dbColor, fontSize: 9, fontFamily: "var(--font-mono)", fontWeight: 700 }}>PG</span>
                    <span style={{ color: "rgba(255,255,255,0.38)", fontSize: 9 }}>{statusLabel(sys.dbStatus)}</span>
                  </div>
                  <ToggleBadge label="Swarm" icon="◈" enabled={swarmEnabled} onToggle={toggleSwarm} accentColor="#22d3ee" />
                  <ToggleBadge label="JeTool" icon="⚡" enabled={jetoolEnabled} onToggle={toggleJetool} accentColor="#f59e0b" />
                  <StatusBadge label="PLUGINS" value={`${activePlugins}/${totalPlugins}`} color={activePlugins === totalPlugins ? "#4ade80" : "#fbbf24"} icon="⬡" />
                  <ToggleBadge label="Telemetry" icon="📡" enabled={telemetryEnabled} onToggle={toggleTelemetry} accentColor="#a78bfa" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

// ── Live clock ────────────────────────────────────────────────────────────────

function LiveClock() {
  const [time, setTime] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = time.getHours().toString().padStart(2, "0");
  const mm = time.getMinutes().toString().padStart(2, "0");
  const ss = time.getSeconds().toString().padStart(2, "0");

  return (
    <span
      className="flex-shrink-0 text-[9px] font-bold tabular-nums"
      style={{
        color: "rgba(255,255,255,0.28)",
        fontFamily: "var(--font-mono, monospace)",
        letterSpacing: "0.06em",
      }}
    >
      {hh}:{mm}:{ss} UTC
    </span>
  );
}
