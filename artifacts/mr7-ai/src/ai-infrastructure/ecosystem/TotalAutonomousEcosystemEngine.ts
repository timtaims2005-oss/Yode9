import type { JsonValue, ModelRequest, ModelResponse } from "../types";
import type { EcosystemTraceEvent, SensoryPacket } from "./types";
import { MultimodalStreamIngestion, RealTimeSensoryTracker } from "./perception";
import { ReasoningEngine, WorldDigitalTwinSimulator, GoalDecompositionEngine } from "./cognition";
import { WorkingMemoryManager, EpisodicMemoryLedger, ProceduralSkillStore } from "./memory";
import { AutomatedDataFlywheel, SyntheticDataGenerator } from "./evolution";
import { BiDirectionalGuardrails, DeterministicFallbackEngine, unavailableTEE, type TEECalculationProvider } from "./security";
import { AITracingTelemetry, LLMGatewayRouter, HumanInTheLoopProtocol } from "./governance";
import { HierarchicalSwarmOrchestrator, type HierarchicalAgent } from "./swarms";

export type TotalEcosystemOptions = {
  agents?: HierarchicalAgent[];
  tee?: TEECalculationProvider;
  approval?: (request: { id: string; action: string; sensitive: boolean }) => Promise<boolean>;
  model?: { complete(request: ModelRequest): Promise<ModelResponse> };
};
export type TotalEcosystemResult = {
  input: string;
  events: number;
  plan: ReturnType<GoalDecompositionEngine["decompose"]>;
  simulation: ReturnType<WorldDigitalTwinSimulator["simulate"]>;
  swarm: { manager: JsonValue; workers: JsonValue[]; review?: JsonValue };
  gateway: "completed" | "skipped";
  traces: number;
  flywheelRecords: number;
};

export class TotalAutonomousEcosystemEngine {
  readonly ingestion = new MultimodalStreamIngestion();
  readonly tracker = new RealTimeSensoryTracker();
  readonly workingMemory = new WorkingMemoryManager();
  readonly episodicLedger = new EpisodicMemoryLedger();
  readonly proceduralSkills = new ProceduralSkillStore();
  readonly flywheel = new AutomatedDataFlywheel();
  private readonly reasoning = new ReasoningEngine();
  private readonly twin = new WorldDigitalTwinSimulator();
  private readonly decomposition = new GoalDecompositionEngine();
  private readonly synthetic = new SyntheticDataGenerator();
  private readonly guardrails = new BiDirectionalGuardrails();
  private readonly telemetry = new AITracingTelemetry();
  private readonly gateway = new LLMGatewayRouter();
  private readonly fallback = new DeterministicFallbackEngine(() => ({ status: "fallback", reason: "runtime anomaly" }));
  private readonly options: TotalEcosystemOptions;
  private events: EcosystemTraceEvent[] = [];

  constructor(options: TotalEcosystemOptions = {}) { this.options = options; }
  async run(input: string, packets: SensoryPacket[] = []): Promise<TotalEcosystemResult> {
    const inputCheck = this.guardrails.input(input);
    if (!inputCheck.allowed) throw new Error("Ecosystem input blocked by guardrails.");
    this.mark("sensory.ingestion", "started");
    packets.forEach((packet) => { const normalized = this.ingestion.ingest(packet); this.tracker.track(normalized); });
    this.mark("sensory.ingestion", "completed", { count: packets.length });
    this.workingMemory.add({ id: `working-${Date.now()}`, content: inputCheck.text, timestamp: Date.now() });
    const plan = this.decomposition.decompose(inputCheck.text);
    const simulation = this.twin.simulate({ status: "ready" }, plan);
    if (!simulation.safe) throw new Error("Ecosystem simulation requires approval before execution.");
    this.mark("cognition.world-simulation", "completed", simulation);
    const swarm = await new HierarchicalSwarmOrchestrator(this.options.agents ?? []).execute(inputCheck.text);
    const approval = new HumanInTheLoopProtocol(this.options.approval);
    if (!await approval.requireApproval({ id: "ecosystem-run", action: inputCheck.text, sensitive: plan.risk >= 0.8 })) throw new Error("Human approval denied.");
    let gateway: "completed" | "skipped" = "skipped";
    if (this.options.model) { await this.telemetry.record("llm.gateway", () => this.options.model!.complete({ messages: [{ role: "user", content: inputCheck.text }] })); gateway = "completed"; }
    this.episodicLedger.append({ id: `episode-${Date.now()}`, content: `${inputCheck.text} -> swarm`, timestamp: Date.now() });
    this.flywheel.capture({ id: `flywheel-${Date.now()}`, input: inputCheck.text, output: JSON.stringify(swarm), success: true });
    this.synthetic.generate(inputCheck.text, ["manager", "worker", "reviewer"]).forEach((example) => this.flywheel.capture({ id: `synthetic-${Date.now()}-${example.output}`, input: example.input, output: example.output, success: true }));
    this.mark("self-improvement.flywheel", "completed", { records: this.flywheel.size() });
    return { input: inputCheck.text, events: packets.length, plan, simulation, swarm, gateway, traces: this.events.length, flywheelRecords: this.flywheel.size() };
  }
  trace(): EcosystemTraceEvent[] { return [...this.events]; }
  private mark(stage: string, status: EcosystemTraceEvent["status"], data?: JsonValue): void { this.events.push({ stage, status, timestamp: Date.now(), data }); }
}