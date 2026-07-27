import { SafeSimulationPlugin } from "./safe-plugin";

export class OmniAuditPlugin extends SafeSimulationPlugin {
  readonly name = "OmniAuditPlugin";
  protected readonly capability = "defensive audit planning";
}

export default OmniAuditPlugin;
