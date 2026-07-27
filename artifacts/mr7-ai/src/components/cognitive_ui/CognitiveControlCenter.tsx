import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Activity, BrainCircuit, Check, ChevronRight, Code2, Cpu, Crosshair, LockKeyhole, Network, PlugZap, Radio, RefreshCw, ScanSearch, Settings2, ShieldCheck, Terminal, X } from "lucide-react";
import styles from "./CognitiveControlCenter.module.css";

export type AutonomyMode = "manual" | "semi-auto" | "fully-autonomous";
type ConnectionState = "connecting" | "live" | "simulation" | "error";
type LogLevel = "info" | "warn" | "ok" | "error";

export interface CognitivePlugin {
  id: string;
  name: string;
  scope: string;
  enabled: boolean;
  icon: "network" | "scan" | "shield" | "code";
}

export interface TelemetryEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
}

export interface CognitiveControlCenterProps {
  onClose: () => void;
  streamUrl?: string;
}

interface StreamPacket {
  type?: string;
  level?: LogLevel;
  source?: string;
  message?: string;
  node?: string;
  latency?: number;
  tokens?: number;
  confidence?: number;
}

const initialPlugins: CognitivePlugin[] = [
  { id: "recon", name: "Reconnaissance", scope: "network.read", enabled: true, icon: "network" },
  { id: "cve", name: "CVE Correlator", scope: "intel.enrich", enabled: true, icon: "scan" },
  { id: "sandbox", name: "Sandbox Runner", scope: "code.execute", enabled: false, icon: "code" },
  { id: "sentinel", name: "Sentinel Guard", scope: "action.approve", enabled: true, icon: "shield" },
];

const initialSchema = `{
  "intent": "string",
  "priority": "high",
  "constraints": {
    "scope": "string",
    "requiresApproval": true
  },
  "evidence": []
}`;

const seedTelemetry: TelemetryEntry[] = [
  { id: "seed-1", timestamp: "14:32:08.041", level: "ok", source: "stream", message: "agentic stream handshake accepted" },
  { id: "seed-2", timestamp: "14:32:08.114", level: "info", source: "intent", message: "intent normalized · target: perimeter inventory" },
  { id: "seed-3", timestamp: "14:32:08.392", level: "info", source: "swarm", message: "3 specialists allocated · quorum 0.86" },
  { id: "seed-4", timestamp: "14:32:09.027", level: "warn", source: "guard", message: "sandbox runner held · manual approval required" },
];

const nodeLabels = [
  { id: "intent", label: "Intent", meta: "normalized", icon: Crosshair, className: styles.nodeIntent },
  { id: "swarm", label: "Swarm", meta: "3 specialists", icon: Network, className: styles.nodeSwarm },
  { id: "plugin", label: "Active plugin", meta: "recon.v2", icon: PlugZap, className: styles.nodePlugin },
  { id: "telemetry", label: "Telemetry", meta: "streaming", icon: Activity, className: styles.nodeTelemetry },
  { id: "reflection", label: "Reflection", meta: "confidence 86%", icon: BrainCircuit, className: styles.nodeReflection },
] as const;

function isLogLevel(value: unknown): value is LogLevel {
  return value === "info" || value === "warn" || value === "ok" || value === "error";
}

function parsePacket(raw: string): StreamPacket | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== "object" || value === null) return null;
    const record = value as Record<string, unknown>;
    return {
      type: typeof record.type === "string" ? record.type : undefined,
      level: isLogLevel(record.level) ? record.level : undefined,
      source: typeof record.source === "string" ? record.source : undefined,
      message: typeof record.message === "string" ? record.message : undefined,
      node: typeof record.node === "string" ? record.node : undefined,
      latency: typeof record.latency === "number" ? record.latency : undefined,
      tokens: typeof record.tokens === "number" ? record.tokens : undefined,
      confidence: typeof record.confidence === "number" ? record.confidence : undefined,
    };
  } catch {
    return null;
  }
}

function nowStamp(): string {
  return new Date().toISOString().slice(11, 23);
}

function pluginIcon(icon: CognitivePlugin["icon"]) {
  if (icon === "network") return Network;
  if (icon === "scan") return ScanSearch;
  if (icon === "shield") return ShieldCheck;
  return Code2;
}

export function CognitiveControlCenter({ onClose, streamUrl = "/api/v1/agentic/stream" }: CognitiveControlCenterProps) {
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [plugins, setPlugins] = useState<CognitivePlugin[]>(initialPlugins);
  const [mode, setMode] = useState<AutonomyMode>("semi-auto");
  const [schema, setSchema] = useState(initialSchema);
  const [schemaError, setSchemaError] = useState("");
  const [telemetry, setTelemetry] = useState<TelemetryEntry[]>(seedTelemetry);
  const [activeNode, setActiveNode] = useState("telemetry");
  const [metrics, setMetrics] = useState({ latency: 42, tokens: 1840, confidence: 86 });
  const [lastEvent, setLastEvent] = useState("awaiting stream");
  const streamRef = useRef<EventSource | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const terminalRef = useRef<HTMLDivElement | null>(null);
  const hasReceivedPacket = useRef(false);

  const addTelemetry = (entry: Omit<TelemetryEntry, "id" | "timestamp">) => {
    setTelemetry((current) => [...current.slice(-47), { ...entry, id: `${Date.now()}-${current.length}`, timestamp: nowStamp() }]);
  };

  useEffect(() => {
    let cancelled = false;
    let eventSource: EventSource | null = null;
    const eventTypes = ["intent", "delegation", "plugin", "output", "reflection", "complete", "error"];

    const handleEvent = (type: string, raw: string): void => {
      const packet = parsePacket(raw);
      if (!packet || cancelled) return;
      hasReceivedPacket.current = true;
      setConnection(type === "error" ? "error" : "live");
      setLastEvent(packet.message ?? type);
      if (packet.node) setActiveNode(packet.node);
      if (packet.latency !== undefined || packet.tokens !== undefined || packet.confidence !== undefined) {
        setMetrics((current) => ({
          latency: packet.latency ?? current.latency,
          tokens: packet.tokens ?? current.tokens,
          confidence: packet.confidence ?? current.confidence,
        }));
      }
      addTelemetry({
        level: packet.level ?? (type === "error" ? "error" : type === "complete" ? "ok" : "info"),
        source: packet.source ?? type,
        message: packet.message ?? `${type} event received`,
      });
    };

    const connect = async (): Promise<void> => {
      try {
        const response = await fetch(streamUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            intent: "defensive perimeter inventory",
            mode: "simulation",
            input: { source: "cognitive-control-center" },
            authorizedScope: { id: "control-center-read-only", actions: ["read-only-analysis", "reporting"] },
          }),
        });
        if (!response.ok) throw new Error(`agentic start returned ${response.status}`);
        const value: unknown = await response.json();
        if (typeof value !== "object" || value === null || !("jobId" in value)) throw new Error("agentic start response missing jobId");
        const jobId = (value as Record<string, unknown>)["jobId"];
        if (typeof jobId !== "string" || cancelled) throw new Error("agentic start response invalid");
        eventSource = new EventSource(`${streamUrl}?jobId=${encodeURIComponent(jobId)}&stream=true`);
        streamRef.current = eventSource;
        eventSource.onopen = () => {
          setConnection("live");
          setLastEvent("connected to agentic stream");
          addTelemetry({ level: "ok", source: "stream", message: `connected · job ${jobId.slice(0, 8)}` });
        };
        for (const eventType of eventTypes) {
          eventSource.addEventListener(eventType, (event: MessageEvent<string>) => handleEvent(eventType, event.data));
        }
        eventSource.onerror = () => {
          if (hasReceivedPacket.current) {
            setConnection("error");
            setLastEvent("stream interrupted · retrying");
            addTelemetry({ level: "error", source: "stream", message: "connection interrupted · browser will retry" });
          }
        };
      } catch (error: unknown) {
        if (cancelled) return;
        setConnection("simulation");
        setActiveNode("reflection");
        setLastEvent("API unavailable · local simulation");
        addTelemetry({ level: "warn", source: "fallback", message: error instanceof Error ? `${error.message} · local simulation active` : "API unavailable · local simulation active" });
      }
    };

    fallbackTimerRef.current = window.setTimeout(() => {
      if (!hasReceivedPacket.current && !eventSource) {
        setConnection("simulation");
        setActiveNode("reflection");
        setLastEvent("API unavailable · local simulation");
        addTelemetry({ level: "warn", source: "fallback", message: "API unavailable · local simulation active" });
      }
    }, 2600);
    void connect();

    return () => {
      cancelled = true;
      eventSource?.close();
      if (fallbackTimerRef.current !== null) window.clearTimeout(fallbackTimerRef.current);
      streamRef.current = null;
    };
  }, [streamUrl]);

  useEffect(() => {
    const terminal = terminalRef.current;
    if (terminal) terminal.scrollTop = terminal.scrollHeight;
  }, [telemetry]);

  useEffect(() => {
    if (connection !== "simulation") return;
    const interval = window.setInterval(() => {
      const sequence = ["intent", "swarm", "plugin", "telemetry", "reflection"];
      const nextNode = sequence[Math.floor(Math.random() * sequence.length)] ?? "telemetry";
      setActiveNode(nextNode);
      setMetrics((current) => ({
        latency: Math.max(28, Math.round(current.latency + (Math.random() * 12 - 6))),
        tokens: current.tokens + Math.floor(Math.random() * 18),
        confidence: Math.max(78, Math.min(94, current.confidence + Math.round(Math.random() * 4 - 2))),
      }));
      addTelemetry({ level: "info", source: "sim", message: `simulated ${nextNode} pulse · no API response` });
    }, 3400);
    return () => window.clearInterval(interval);
  }, [connection]);

  const validateSchema = (value: string) => {
    setSchema(value);
    try {
      JSON.parse(value);
      setSchemaError("");
    } catch (error) {
      setSchemaError(error instanceof Error ? error.message.replace(/^JSON\.parse: /, "") : "Invalid JSON");
    }
  };

  const pushControlUpdate = (payload: Record<string, unknown>, message: string) => {
    addTelemetry({ level: "info", source: "control", message });
    void fetch(streamUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    }).catch(() => {
      if (connection === "live") addTelemetry({ level: "warn", source: "control", message: "control endpoint unavailable · view remains local" });
    });
  };

  const togglePlugin = (pluginId: string) => {
    setPlugins((current) => current.map((plugin) => {
      if (plugin.id !== pluginId) return plugin;
      const enabled = !plugin.enabled;
      pushControlUpdate({ type: "plugin_permission", plugin: plugin.id, enabled }, `${plugin.name} ${enabled ? "enabled" : "disabled"}`);
      return { ...plugin, enabled };
    }));
  };

  const chooseMode = (nextMode: AutonomyMode) => {
    setMode(nextMode);
    pushControlUpdate({ type: "autonomy", mode: nextMode }, `autonomy mode → ${nextMode}`);
  };

  const applySchema = () => {
    try {
      const parsed: unknown = JSON.parse(schema);
      setSchemaError("");
      pushControlUpdate({ type: "schema", schema: parsed }, "JSON schema accepted · policy updated");
    } catch {
      setSchemaError("Schema must be valid JSON before applying");
      addTelemetry({ level: "error", source: "schema", message: "schema rejected · invalid JSON" });
    }
  };

  const resetConnection = () => {
    streamRef.current?.close();
    setConnection("connecting");
    hasReceivedPacket.current = false;
    setLastEvent("reconnecting to agentic stream");
    addTelemetry({ level: "info", source: "stream", message: "manual reconnect requested" });
    window.setTimeout(() => window.location.reload(), 80);
  };

  const enabledCount = useMemo(() => plugins.filter((plugin) => plugin.enabled).length, [plugins]);

  const handleSchemaChange = (event: ChangeEvent<HTMLTextAreaElement>) => validateSchema(event.target.value);

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-labelledby="cognitive-control-title" data-testid="cognitive-control-center">
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <div className={styles.brand}>
            <div className={styles.brandMark}><BrainCircuit size={20} strokeWidth={1.7} /></div>
            <div>
              <p className={styles.eyebrow}>MR7 / agentic systems</p>
              <h1 id="cognitive-control-title" className={styles.title}>Cognitive Control Center</h1>
            </div>
          </div>
          <div className={styles.headerActions}>
            <div className={styles.connection} data-state={connection === "simulation" ? "simulation" : "live"} data-testid="status-agentic-connection">
              <span className={styles.statusDot} />
              {connection === "connecting" ? "CONNECTING" : connection === "live" ? "STREAM LIVE" : connection === "simulation" ? "SIMULATION FALLBACK" : "STREAM ERROR"}
            </div>
            <button type="button" className={styles.iconButton} onClick={resetConnection} aria-label="Reconnect agentic stream" data-testid="button-reconnect-stream"><RefreshCw size={15} /></button>
            <button type="button" className={styles.iconButton} onClick={onClose} aria-label="Close cognitive control center" data-testid="button-close-cognitive-center"><X size={17} /></button>
          </div>
        </header>

        <div className={styles.body}>
          <main className={styles.mainColumn}>
            <section>
              <div className={styles.sectionHeading}>
                <div>
                  <span className={styles.kicker}>cognitive topology / live</span>
                  <h2 className={styles.sectionTitle}>Thought graph</h2>
                  <p className={styles.sectionHint}>Follow the control loop from normalized intent to reflective telemetry.</p>
                </div>
                <Radio size={17} color="#00d7ec" aria-label="Live telemetry" />
              </div>
              <div className={`${styles.panel} ${styles.graphPanel}`} data-testid="panel-thought-graph">
                <div className={styles.graphCanvas}>
                  <div className={`${styles.graphLine} ${styles.lineOne}`} />
                  <div className={`${styles.graphLine} ${styles.lineTwo}`} />
                  <div className={`${styles.graphLine} ${styles.lineThree}`} />
                  <div className={`${styles.graphLine} ${styles.lineFour}`} />
                  {nodeLabels.map(({ id, label, meta, icon: Icon, className }) => (
                    <button type="button" key={id} className={`${styles.graphNode} ${className}`} data-active={activeNode === id} onClick={() => setActiveNode(id)} data-testid={`button-graph-node-${id}`}>
                      <span className={styles.nodeIcon}><Icon size={14} /></span>
                      <span><span className={styles.nodeText}>{label}</span><span className={styles.nodeMeta}>{meta}</span></span>
                    </button>
                  ))}
                </div>
                <div className={styles.graphFooter}>
                  <span className={styles.graphTag}><strong>LOOP</strong> intent → reflection</span>
                  <span className={styles.graphTag}><strong>ACTIVE</strong> {activeNode}</span>
                  <span className={styles.graphTag}><strong>QUORUM</strong> 0.86</span>
                </div>
              </div>
            </section>

            <section className={styles.terminalPanel} data-testid="panel-telemetry-terminal">
              <div className={styles.terminalTop}>
                <div className={styles.terminalLights}><span /><span /><span /></div>
                <span className={styles.terminalLabel}><Terminal size={12} /> telemetry / agentic stream</span>
                <span className={styles.terminalLabel}>{telemetry.length.toString().padStart(2, "0")} events</span>
              </div>
              <div className={styles.terminal} ref={terminalRef}>
                {telemetry.map((entry) => (
                  <div className={styles.terminalLine} data-level={entry.level} key={entry.id} data-testid={`text-telemetry-${entry.id}`}>
                    <strong>{entry.timestamp}</strong><b>{entry.source}</b><span>{entry.message}</span>
                  </div>
                ))}
              </div>
            </section>
          </main>

          <aside className={styles.sideColumn}>
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.kicker}>policy surface / jetool</span>
                <h2 className={styles.sectionTitle}>Control matrix</h2>
                <p className={styles.sectionHint}>Permission gates are applied to the next agentic decision.</p>
              </div>
              <Settings2 size={17} color="#ff5365" />
            </div>

            <section className={`${styles.panel} ${styles.controlPanel}`} data-testid="panel-plugin-permissions">
              <div className={styles.sectionHeading}>
                <div><h3 className={styles.sectionTitle}>Plugin permissions</h3><p className={styles.sectionHint}>{enabledCount} of {plugins.length} plugins armed</p></div>
                <LockKeyhole size={14} color="#7f8ea7" />
              </div>
              {plugins.map((plugin) => {
                const Icon = pluginIcon(plugin.icon);
                return (
                  <div className={styles.pluginRow} key={plugin.id}>
                    <div className={styles.pluginIdentity}>
                      <span className={styles.pluginGlyph}><Icon size={14} /></span>
                      <span><span className={styles.pluginName}>{plugin.name}</span><span className={styles.pluginScope}>{plugin.scope}</span></span>
                    </div>
                    <button type="button" className={styles.toggle} data-enabled={plugin.enabled} onClick={() => togglePlugin(plugin.id)} aria-label={`${plugin.enabled ? "Disable" : "Enable"} ${plugin.name}`} data-testid={`toggle-plugin-${plugin.id}`} />
                  </div>
                );
              })}
            </section>

            <section className={`${styles.panel} ${styles.controlPanel}`} style={{ marginTop: 14 }} data-testid="panel-autonomy-mode">
              <div className={styles.sectionHeading}>
                <div><h3 className={styles.sectionTitle}>Autonomy</h3><p className={styles.sectionHint}>Decision authority boundary</p></div>
                <Cpu size={14} color="#7f8ea7" />
              </div>
              <div className={styles.modeList}>
                {([["manual", "Manual", "every action"], ["semi-auto", "Semi-Auto", "approval gates"], ["fully-autonomous", "Fully Autonomous", "policy bound"]] as const).map(([value, label, detail]) => (
                  <button type="button" className={styles.modeButton} data-active={mode === value} onClick={() => chooseMode(value)} key={value} data-testid={`button-autonomy-${value}`}>
                    <span><strong>{label}</strong><span className={styles.pluginScope}>{detail}</span></span><span className={styles.modeIndicator} />
                  </button>
                ))}
              </div>
            </section>

            <section className={`${styles.panel} ${styles.controlPanel} ${styles.controlPanelWide}`} style={{ marginTop: 14 }} data-testid="panel-json-schema">
              <div className={styles.sectionHeading}>
                <div><h3 className={styles.sectionTitle}>Decision schema</h3><p className={styles.sectionHint}>JSON contract for agent output</p></div>
                <Code2 size={14} color="#7f8ea7" />
              </div>
              <textarea className={styles.schemaEditor} value={schema} onChange={handleSchemaChange} spellCheck={false} aria-label="Decision JSON schema editor" data-testid="input-json-schema" />
              <div className={styles.schemaFooter}>
                <span className={styles.validation} data-valid={!schemaError}><Check size={12} />{schemaError || "Valid JSON · ready to apply"}</span>
                <button type="button" className={styles.primaryButton} onClick={applySchema} data-testid="button-apply-schema">Apply policy <ChevronRight size={12} /></button>
              </div>
            </section>

            <div className={styles.footer}>
              <span><strong>LAST EVENT</strong> · {lastEvent}</span>
              <span><strong>LATENCY</strong> {metrics.latency}ms · <strong>TOKENS</strong> {metrics.tokens.toLocaleString()} · <strong>CONF</strong> {metrics.confidence}%</span>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CognitiveControlCenter;