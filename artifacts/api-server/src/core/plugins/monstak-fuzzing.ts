import { SafeSimulationPlugin } from "./safe-plugin";

export class MonstakFuzzingPlugin extends SafeSimulationPlugin {
  readonly name = "MonstakFuzzingPlugin";
  protected readonly capability = "non-delivery input test planning";
}

export default MonstakFuzzingPlugin;
