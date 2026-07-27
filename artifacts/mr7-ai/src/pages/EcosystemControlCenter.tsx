import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import {
  Activity, ArrowLeft, Brain, CheckCircle2, ChevronRight, CircleDashed,
  Database, Eye, Fingerprint, Gauge, GitBranch, Globe2, Layers3, LockKeyhole,
  Network, Play, RotateCcw, ScanSearch, ServerCog, ShieldCheck, Sparkles,
  TerminalSquare, Users, Wrench, XCircle, Zap,
} from "lucide-react";
import {
  TotalAutonomousEcosystemEngine,
} from "@/ai-infrastructure/ecosystem/TotalAutonomousEcosystemEngine";
import type { EcosystemTraceEvent, SensoryPacket } from "@/ai-infrastructure/ecosystem/types";
import type { HierarchicalAgent } from "@/ai-infrastructure/ecosystem/swarms";
import type { JsonValue } from "@/ai-infrastructure/types";
import type { LucideIcon } from "lucide-react";

type SectorStatus = "online" | "ready" | "attention";
type Sector = {
  id: string;
  number: string;
  name: string;
  description: string;
  status: SectorStatus;
  metric: string;
  icon: typeof Brain;
  color: string;
  capabilities: string[];
};

const sectors: Sector[] = [
  { id: "perception", number: "01", name: "Perception & Input", description: "Multimodal sensory ingestion and real-time state tracking.", status: "online", metric: "7 modalities", icon: Eye, color: "#35d9b2", capabilities: ["Text / audio / video", "Spatial + IoT streams", "Document OCR"] },
  { id: "tools", number: "02", name: "Skills & Actuators", description: "Provider-ready execution for tools, APIs, browsers, and MCP.", status: "ready", metric: "5 adapters", icon: Wrench, color: "#6ca8ff", capabilities: ["MCP connector", "Browser automation", "Code sandbox"] },
  { id: "cognition", number: "03", name: "Cognition & Planning", description: "Reasoning, digital-twin simulation, decomposition, and negotiation.", status: "online", metric: "3 thought modes", icon: Brain, color: "#b48cff", capabilities: ["Tree / graph / chain", "Probabilistic twin", "Game theory"] },
  { id: "memory", number: "04", name: "Universal Memory", description: "Working, episodic, semantic, and procedural memory in one view.", status: "online", metric: "4 memory layers", icon: Database, color: "#f6b657", capabilities: ["Context compression", "Immutable ledger", "Verified recipes"] },
  { id: "evolution", number: "05", name: "Self-Improvement", description: "Filtered flywheel capture, synthetic data, and adapter jobs.", status: "ready", metric: "Flywheel armed", icon: Sparkles, color: "#ef8bff", capabilities: ["Dataset filtering", "LoRA / DPO queue", "Self-play synthesis"] },
  { id: "security", number: "06", name: "Security & Sovereignty", description: "Bidirectional guardrails, red teaming, TEE and fallback rules.", status: "attention", metric: "TEE not connected", icon: LockKeyhole, color: "#ff687c", capabilities: ["Prompt injection", "Data leak checks", "Fail-closed TEE"] },
  { id: "governance", number: "07", name: "Governance & Routing", description: "Tracing, judge evaluation, gateway routing, and human escalation.", status: "online", metric: "Trace active", icon: Gauge, color: "#58c8ff", capabilities: ["Execution tree", "LLM-as-a-judge", "HITL protocol"] },
  { id: "swarms", number: "08", name: "Swarms & Recovery", description: "Manager-worker-reviewer topology with bounded self-healing.", status: "online", metric: "3-tier topology", icon: Users, color: "#ff9d5c", capabilities: ["Hierarchical swarm", "Fault isolation", "Hot recovery"] },
];

const agents: HierarchicalAgent[] = [
  { id: "manager", role: "manager", run: async (input: string): Promise<JsonValue> => ({ role: "manager", plan: input, decision: "coordinate" }) },
  { id: "worker-a", role: "worker", run: async (input: string): Promise<JsonValue> => ({ role: "worker", task: "analyze", input }) },
  { id: "reviewer", role: "reviewer", run: async (input: string): Promise<JsonValue> => ({ role: "reviewer", verdict: "approved", reviewed: input }) },
];

const defaultPackets: SensoryPacket[] = [
  { id: "sensor-01", modality: "iot", source: "edge-gateway", timestamp: Date.now(), payload: { signal: "stable", confidence: 0.98 } },
  { id: "stream-01", modality: "text", source: "operator", timestamp: Date.now(), payload: "network telemetry ready" },
];

function statusLabel(status: SectorStatus): string {
  return status === "online" ? "ONLINE" : status === "ready" ? "READY" : "ATTENTION";
}

function StatusDot({ status }: { status: SectorStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-[0.16em] text-white/45">
      <span className={`h-1.5 w-1.5 rounded-full ${status === "attention" ? "bg-amber-400" : status === "ready" ? "bg-sky-400" : "bg-emerald-400 animate-pulse"}`} />
      {statusLabel(status)}
    </span>
  );
}

function TraceRow({ event }: { event: EcosystemTraceEvent }) {
  return (
    <div className="flex items-start gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <div className={`mt-1 h-2 w-2 rounded-full ${event.status === "completed" ? "bg-emerald-400" : event.status === "blocked" ? "bg-amber-400" : "bg-sky-400"}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate font-mono text-[11px] text-white/75">{event.stage}</span>
          <span className="text-[10px] uppercase tracking-widest text-white/30">{event.status}</span>
        </div>
        <span className="text-[10px] text-white/30">{new Date(event.timestamp).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

export default function EcosystemControlCenter() {
  const [, navigate] = useLocation();
  const [engine] = useState(() => new TotalAutonomousEcosystemEngine({ agents }));
  const [goal, setGoal] = useState("Analyze the network telemetry and recommend a safe next action");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Awaited<ReturnType<TotalAutonomousEcosystemEngine["run"]>>>();
  const [error, setError] = useState<string>();
  const [selectedSector, setSelectedSector] = useState("cognition");
  const [activeView, setActiveView] = useState<"overview" | "memory" | "tools" | "approvals">("overview");
  const [approval, setApproval] = useState(true);
  const [serverMode, setServerMode] = useState<"server" | "local">("server");

  const selected = useMemo(() => sectors.find((sector) => sector.id === selectedSector) ?? sectors[2], [selectedSector]);
  const runEngine = async () => {
    if (!goal.trim() || running) return;
    setRunning(true);
    setError(undefined);
    try {
      const response = await fetch("/api/ecosystem/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goal.trim(), packets: defaultPackets }),
      });
      if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? `Ecosystem API returned ${response.status}`);
      setResult(await response.json());
      setServerMode("server");
    } catch (runError) {
      try {
        setResult(await engine.run(goal.trim(), defaultPackets.map((packet) => ({ ...packet, timestamp: Date.now() }))));
        setServerMode("local");
      } catch {
        setError(runError instanceof Error ? runError.message : String(runError));
      }
    } finally {
      setRunning(false);
    }
  };

  const trace = engine.trace();
  const memoryCount = engine.episodicLedger.size();
  const flywheelCount = result?.flywheelRecords ?? engine.flywheel.size();

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#070913] text-white" dir="ltr">
      <div className="pointer-events-none fixed inset-0 opacity-40 [background-image:linear-gradient(rgba(95,116,170,.08)_1px,transparent_1px),linear-gradient(90deg,rgba(95,116,170,.08)_1px,transparent_1px)] [background-size:44px_44px]" />
      <div className="pointer-events-none fixed -left-32 top-20 h-96 w-96 rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed -right-32 bottom-0 h-96 w-96 rounded-full bg-violet-500/10 blur-[120px]" />

      <header className="relative z-10 border-b border-white/[0.08] bg-[#090b16]/85 px-4 py-4 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/app")} className="rounded-xl border border-white/10 bg-white/[0.04] p-2 text-white/60 transition hover:border-white/20 hover:text-white" aria-label="Back to MR7 AI">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_#35d9b2]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-cyan-300/70">MR7 / AUTONOMOUS CONTROL PLANE</span>
              </div>
              <h1 className="mt-1 text-xl font-semibold tracking-tight md:text-2xl">Ecosystem Control Center</h1>
            </div>
          </div>
          <div className="hidden items-center gap-5 md:flex">
            <div className="text-right"><div className="font-mono text-[10px] text-white/35">ENGINE STATE</div><div className="flex items-center gap-2 text-sm text-emerald-300"><Activity className="h-3.5 w-3.5" /> STANDBY / READY</div></div>
            <div className="text-right"><div className="font-mono text-[10px] text-white/35">SECTORS</div><div className="text-sm text-white/80">08 / 08 mapped</div></div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[1500px] space-y-5 px-4 py-5 md:px-8 md:py-8">
        <section className="grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
          <div className="rounded-2xl border border-cyan-300/15 bg-[#0c1020]/90 p-5 shadow-2xl shadow-cyan-950/20 md:p-7">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div><p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-300/65">TOTAL AUTONOMOUS ECOSYSTEM ENGINE</p><h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">Run a governed autonomous mission</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">The live pipeline ingests sensory packets, validates guardrails, simulates the world, runs a hierarchical swarm, records memory, and captures improvement data.</p></div>
              <div className="hidden rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.06] p-3 sm:block"><Zap className="h-5 w-5 text-cyan-300" /></div>
            </div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-widest text-white/35">MISSION OBJECTIVE</label>
            <textarea value={goal} onChange={(event) => setGoal(event.target.value)} className="min-h-24 w-full resize-y rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white outline-none transition placeholder:text-white/25 focus:border-cyan-300/45" placeholder="Describe a safe objective..." />
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button onClick={runEngine} disabled={running || !goal.trim()} className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-[#06101a] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
                {running ? <CircleDashed className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} {running ? "Running ecosystem..." : "Run ecosystem"}
              </button>
              <button onClick={() => { setResult(undefined); setError(undefined); }} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/60 transition hover:border-white/25 hover:text-white"><RotateCcw className="h-4 w-4" /> Clear run</button>
              <span className={`font-mono text-[10px] ${serverMode === "server" ? "text-emerald-300/70" : "text-amber-300/70"}`}>{serverMode === "server" ? "Connected to ecosystem API" : "Local safety fallback active"}</span>
            </div>
            {error && <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-3 text-xs text-rose-200"><XCircle className="h-4 w-4 shrink-0" /> {error}</div>}
            {result && <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">{[["Packets", result.events], ["Plan steps", result.plan.steps.length], ["Workers", result.swarm.workers.length], ["Flywheel", result.flywheelRecords]].map(([label, value]) => <div key={label} className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"><div className="font-mono text-[10px] text-white/35">{label}</div><div className="mt-1 text-xl font-semibold text-white">{value}</div></div>)}</div>}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2">
            {([
              ["Engine", result ? "Completed" : "Standby", result ? CheckCircle2 : ServerCog, result ? "text-emerald-300" : "text-cyan-300"],
              ["Memory", `${memoryCount} episodes`, Database, "text-amber-300"],
              ["Telemetry", `${trace.length} events`, Activity, "text-sky-300"],
              ["Approval", approval ? "Protocol armed" : "Paused", ShieldCheck, approval ? "text-violet-300" : "text-rose-300"],
            ] as [string, string, LucideIcon, string][]).map(([label, value, Icon, color]) => <div key={label} className="rounded-2xl border border-white/[0.08] bg-[#0c1020]/80 p-4"><Icon className={`h-5 w-5 ${color}`} /><div className="mt-5 font-mono text-[10px] uppercase tracking-widest text-white/35">{label}</div><div className="mt-1 text-sm font-medium text-white/80">{value}</div></div>)}
          </div>
        </section>

        <section className="rounded-2xl border border-white/[0.08] bg-[#0b0f1c]/85 p-3 md:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.07] px-2 pb-3">
            <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">ECOSYSTEM TELEMETRY</p><p className="mt-1 text-sm text-white/65">Eight sectors · one governed execution surface</p></div>
            <div className="flex flex-wrap gap-1 rounded-xl bg-black/20 p-1">
              {(["overview", "memory", "tools", "approvals"] as const).map((view) => <button key={view} onClick={() => setActiveView(view)} className={`rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition ${activeView === view ? "bg-white/10 text-white" : "text-white/35 hover:text-white/70"}`}>{view}</button>)}
            </div>
          </div>

          {activeView === "overview" && <div className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-4">{sectors.map((sector) => { const Icon = sector.icon; const active = selectedSector === sector.id; return <button key={sector.id} onClick={() => setSelectedSector(sector.id)} className={`group text-left rounded-2xl border p-4 transition ${active ? "border-white/20 bg-white/[0.07]" : "border-white/[0.07] bg-white/[0.02] hover:border-white/15 hover:bg-white/[0.04]"}`}><div className="flex items-start justify-between"><div className="flex items-center gap-3"><span className="rounded-xl p-2" style={{ color: sector.color, backgroundColor: `${sector.color}14` }}><Icon className="h-4 w-4" /></span><span className="font-mono text-[10px] text-white/25">{sector.number}</span></div><StatusDot status={sector.status} /></div><h3 className="mt-4 text-sm font-medium text-white/85">{sector.name}</h3><p className="mt-1 min-h-10 text-xs leading-5 text-white/40">{sector.description}</p><div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-3"><span className="font-mono text-[10px]" style={{ color: sector.color }}>{sector.metric}</span><ChevronRight className="h-3.5 w-3.5 text-white/25 transition group-hover:translate-x-1 group-hover:text-white/60" /></div></button> })}</div>}

          {activeView === "memory" && <div className="grid gap-4 pt-4 lg:grid-cols-[.9fr_1.1fr]"><div className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.03] p-5"><Database className="h-5 w-5 text-amber-300" /><h3 className="mt-4 text-lg font-medium">Universal memory</h3><p className="mt-2 text-sm leading-6 text-white/45">Working context is compressed locally. Episodic entries are appended immutably after successful runs.</p><div className="mt-6 grid grid-cols-2 gap-2"><div className="rounded-xl bg-black/20 p-3"><div className="font-mono text-[10px] text-white/35">WORKING BUFFER</div><div className="mt-1 text-xl">{engine.workingMemory.snapshot().length}</div></div><div className="rounded-xl bg-black/20 p-3"><div className="font-mono text-[10px] text-white/35">EPISODES</div><div className="mt-1 text-xl">{memoryCount}</div></div></div></div><div className="rounded-2xl border border-white/[0.08] p-5"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-medium">Execution ledger</h3><span className="font-mono text-[10px] text-emerald-300">IMMUTABLE APPEND</span></div>{memoryCount === 0 ? <div className="py-10 text-center text-sm text-white/30">Run a mission to create the first episodic record.</div> : engine.episodicLedger.entriesSince(0).map((entry) => <div key={entry.id} className="border-b border-white/[0.06] py-3 text-xs text-white/60">{entry.content}</div>)}</div></div>}

          {activeView === "tools" && <div className="grid gap-3 pt-4 md:grid-cols-2 xl:grid-cols-3">{([
            ["MCP Connector", "No transport configured", Network, "Connect an MCP server to discover tools."],
            ["Code Sandbox", "Provider required", TerminalSquare, "E2B/Docker executor is intentionally not simulated."],
            ["Browser Automation", "Provider required", Globe2, "Playwright/Puppeteer driver can be injected."],
            ["API + Database", "Provider required", GitBranch, "REST, GraphQL, SQL and graph connectors."],
            ["OCR / Documents", "Ready locally", ScanSearch, "Structured text and field extraction available."],
            ["TEE Calculation", "Fail-closed", Fingerprint, "Sensitive work is refused without enclave hardware."],
          ] as [string, string, LucideIcon, string][]).map(([name, status, Icon, description]) => <div key={name} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"><Icon className="h-5 w-5 text-sky-300" /><div className="mt-4 text-sm font-medium">{name}</div><div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-300/80">{status}</div><p className="mt-3 text-xs leading-5 text-white/40">{description}</p></div>)}</div>}

          {activeView === "approvals" && <div className="grid gap-4 pt-4 lg:grid-cols-[1fr_.8fr]"><div className="rounded-2xl border border-violet-300/15 bg-violet-300/[0.03] p-5"><ShieldCheck className="h-5 w-5 text-violet-300" /><h3 className="mt-4 text-lg font-medium">Human-in-the-loop protocol</h3><p className="mt-2 text-sm leading-6 text-white/45">Sensitive, financial, or high-risk actions must be approved before tool execution. This control is explicit and fail-safe.</p><button onClick={() => setApproval((value) => !value)} className={`mt-5 rounded-xl border px-4 py-2 text-sm transition ${approval ? "border-emerald-300/25 bg-emerald-300/10 text-emerald-200" : "border-rose-300/25 bg-rose-300/10 text-rose-200"}`}>{approval ? "Approval protocol enabled" : "Approval protocol paused"}</button></div><div className="rounded-2xl border border-white/[0.08] p-5"><div className="font-mono text-[10px] uppercase tracking-widest text-white/35">CURRENT QUEUE</div><div className="mt-6 flex items-center gap-3 text-sm text-white/60"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> No pending approvals</div><p className="mt-4 text-xs leading-5 text-white/35">A high-risk run will stop here until a real approval callback is connected.</p></div></div>}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f1c]/85 p-5"><div className="mb-3 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">SELECTED SECTOR</p><h2 className="mt-1 text-lg font-medium">{selected.name}</h2></div><selected.icon className="h-5 w-5" style={{ color: selected.color }} /></div><p className="text-sm leading-6 text-white/45">{selected.description}</p><div className="mt-5 flex flex-wrap gap-2">{selected.capabilities.map((capability) => <span key={capability} className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-white/60">{capability}</span>)}</div><div className="mt-6 flex items-center gap-2 border-t border-white/[0.07] pt-4"><StatusDot status={selected.status} /><span className="text-xs text-white/35">Provider interfaces remain injectable for production deployments.</span></div></div>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0b0f1c]/85 p-5"><div className="mb-3 flex items-center justify-between"><div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">LIVE EXECUTION TRACE</p><h2 className="mt-1 text-lg font-medium">Pipeline events</h2></div><span className="rounded-full border border-cyan-300/20 px-2 py-1 font-mono text-[10px] text-cyan-300">{trace.length} events</span></div>{trace.length ? trace.slice().reverse().map((event, index) => <TraceRow key={`${event.stage}-${index}`} event={event} />) : <div className="flex min-h-36 flex-col items-center justify-center text-center text-white/30"><Activity className="mb-3 h-6 w-6" /><p className="text-sm">Trace stream is waiting</p><p className="mt-1 text-xs">Run the engine to populate observability data.</p></div>}</div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] py-4 text-[10px] text-white/30"><span className="font-mono">MR7 AI · TOTAL AUTONOMOUS ECOSYSTEM · v1.0</span><span className="flex items-center gap-2"><Layers3 className="h-3.5 w-3.5" /> Additive architecture · legacy paths preserved · {flywheelCount} flywheel records</span></footer>
      </main>
    </div>
  );
}