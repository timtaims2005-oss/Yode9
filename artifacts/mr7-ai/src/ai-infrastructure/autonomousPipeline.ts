import { checkInputGuardrails, type GuardrailPolicy } from "./safety/guardrails";
import { DataFlywheel, WorldModel } from "./metacognition";
import { SwarmOrchestrator, type ConsensusResult, type SwarmAgent } from "./swarms";
import { DeterministicReplay, SelfHealingOrchestrator } from "./resilience";
import type { JsonValue } from "./types";

export type AutonomousPipelineOptions = {
  safety?: GuardrailPolicy;
  swarmAgents: SwarmAgent[];
  maxRecoveryAttempts?: number;
  worldModel?: WorldModel;
  replay?: DeterministicReplay;
  flywheel?: DataFlywheel;
};

export type AutonomousPipelineResult = {
  consensus: ConsensusResult;
  replaySnapshots: number;
  capturedInteraction: boolean;
};

export async function executeAutonomousPipeline(
  input: string,
  options: AutonomousPipelineOptions,
): Promise<AutonomousPipelineResult> {
  const safety = checkInputGuardrails(input, options.safety);
  if (!safety.allowed) throw new Error("Autonomous pipeline input blocked by guardrails.");
  const replay = options.replay ?? new DeterministicReplay();
  const flywheel = options.flywheel ?? new DataFlywheel();
  const worldModel = options.worldModel ?? new WorldModel();
  replay.checkpoint("input.accepted", { input: safety.text } as JsonValue);
  const prediction = await worldModel.dryRun({ id: "swarm-consensus", description: "Run heterogeneous agent consensus", risk: 0.2 });
  replay.checkpoint("world-model.completed", prediction as unknown as JsonValue);
  const orchestrator = new SwarmOrchestrator(options.swarmAgents, options.maxRecoveryAttempts ?? 3);
  const healer = new SelfHealingOrchestrator(options.maxRecoveryAttempts ?? 3);
  const consensus = await healer.run(() => orchestrator.reachConsensus(safety.text), { canRetry: true });
  replay.checkpoint("swarm.completed", consensus as unknown as JsonValue);
  flywheel.capture({ id: replay.latest()?.id ?? "interaction", input, output: consensus.decision, outcome: consensus.confidence > 0.5 ? "success" : "uncertain", createdAt: Date.now() });
  return { consensus, replaySnapshots: replay.replay().length, capturedInteraction: true };
}
