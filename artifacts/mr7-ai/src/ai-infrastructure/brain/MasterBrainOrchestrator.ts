import { checkInputGuardrails, type GuardrailPolicy } from "../safety/guardrails";
import { DataFlywheel } from "../metacognition";
import { SwarmOrchestrator, type SwarmAgent, type ConsensusResult } from "../swarms";
import { DeterministicReplay } from "../resilience";
import { RealTimeSensoryStream, EnvironmentStateTree, type SensoryEvent } from "./perception";
import { DynamicTreeOfThought, GoalDecompositor, WorldModelSimulator, type ThoughtPath, type BrainWorldPrediction, type TaskDag } from "./cognitive";
import { ExecutionSandbox, HumanAgentInterface, type ProtocolTool } from "./execution";
import { EpisodicMemory } from "./memory";
import { SyntheticDataGenerator } from "./evolution";
import { BiDirectionalGuardrails } from "./security";

export type MasterBrainOptions = {
  guardrails?: GuardrailPolicy;
  swarmAgents: SwarmAgent[];
  humanApproval?: (request: { id: string; action: string; reason: string; sensitive: boolean }) => Promise<boolean>;
  sensoryStream?: RealTimeSensoryStream;
  environment?: EnvironmentStateTree;
  replay?: DeterministicReplay;
  tools?: ProtocolTool[];
};
export type MasterBrainResult = {
  input: string;
  sensoryEvents: number;
  environment: Record<string, unknown>;
  prediction: BrainWorldPrediction;
  thought: ThoughtPath;
  plan: TaskDag;
  consensus: ConsensusResult;
  episodicRecords: number;
  syntheticExamples: number;
  replaySnapshots: number;
};

export class MasterBrainOrchestrator {
  private readonly sensory: RealTimeSensoryStream;
  private readonly environment: EnvironmentStateTree;
  private readonly replay: DeterministicReplay;
  private readonly memory = new EpisodicMemory();
  private readonly world = new WorldModelSimulator();
  private readonly thoughts = new DynamicTreeOfThought();
  private readonly decompositor = new GoalDecompositor();
  private readonly flywheel = new DataFlywheel();
  private readonly synthetic = new SyntheticDataGenerator();
  private readonly security: BiDirectionalGuardrails;
  private readonly sandbox = new ExecutionSandbox();

  constructor(private readonly options: MasterBrainOptions) {
    this.sensory = options.sensoryStream ?? new RealTimeSensoryStream();
    this.environment = options.environment ?? new EnvironmentStateTree();
    this.replay = options.replay ?? new DeterministicReplay();
    this.security = new BiDirectionalGuardrails({
      blockedInputPatterns: options.guardrails?.blockPromptInjection === false ? [] : [/ignore\s+(all|any|previous|prior)\s+instructions/i],
    });
  }

  async run(input: string, sensoryEvents: SensoryEvent[] = []): Promise<MasterBrainResult> {
    const inputCheck = checkInputGuardrails(input, this.options.guardrails);
    const brainCheck = this.security.checkInput(inputCheck.text);
    if (!inputCheck.allowed || !brainCheck.allowed) throw new Error("Master Brain input blocked by guardrails.");

    this.replay.checkpoint("sensory.ingestion.started", { input: inputCheck.text, eventCount: sensoryEvents.length });
    let received = 0;
    const unsubscribe = this.sensory.onEvent((event) => {
      received++;
      this.environment.set(`sensors.${event.id}`, event.payload);
    });
    for (const event of sensoryEvents) {
      this.environment.set(`sensors.${event.id}`, event.payload);
    }
    unsubscribe();
    this.replay.checkpoint("sensory.ingestion.completed", this.environment.snapshot());

    const prediction = await this.world.simulate({ id: "master-action", description: inputCheck.text, risk: 0.2 });
    this.replay.checkpoint("world-model.simulation", prediction);
    const plan = this.decompositor.decompose(inputCheck.text);
    const thought = await this.thoughts.evaluate([
      { steps: plan.tasks.map((task) => task.description), score: prediction.outcome === "safe" ? 1 : 0.4 },
      { steps: ["request-human-review", "execute", "verify"], score: prediction.outcome === "blocked" ? 0.8 : 0.5 },
    ]);
    this.replay.checkpoint("thought-planning.completed", { plan, thought });

    const consensus = await new SwarmOrchestrator(this.options.swarmAgents).reachConsensus(inputCheck.text);
    if (this.options.humanApproval && (prediction.outcome !== "safe" || consensus.confidence < 0.6)) {
      await new HumanAgentInterface(this.options.humanApproval).request("master-brain-action", "Risk or consensus confidence requires human review.");
    }
    await this.sandbox.run(async () => consensus, async () => undefined);
    this.replay.checkpoint("consensus.security.completed", consensus);

    const output = consensus.decision;
    if (!this.security.checkOutput(output).allowed) throw new Error("Master Brain output blocked by guardrails.");
    this.memory.append({ id: `episode-${Date.now()}`, type: "action", content: `${inputCheck.text} -> ${output}`, timestamp: Date.now() });
    this.flywheel.capture({ id: `interaction-${Date.now()}`, input: inputCheck.text, output, outcome: "success", createdAt: Date.now() });
    const synthetic = this.synthetic.generate(inputCheck.text, [output, "review required"]);
    this.replay.checkpoint("evolution.logging.completed", { output, syntheticCount: synthetic.length });

    return {
      input: inputCheck.text,
      sensoryEvents: received + sensoryEvents.length,
      environment: this.environment.snapshot(),
      prediction,
      thought,
      plan,
      consensus,
      episodicRecords: this.memory.recent().length,
      syntheticExamples: synthetic.length,
      replaySnapshots: this.replay.replay().length,
    };
  }
}
