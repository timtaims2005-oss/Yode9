import { SafeSimulationPlugin } from "./safe-plugin";

export class HeroOrchestratorPlugin extends SafeSimulationPlugin {
  readonly name = "HeroOrchestratorPlugin";
  protected readonly capability = "orchestration review";
}

export default HeroOrchestratorPlugin;
