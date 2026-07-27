import { SafeSimulationPlugin } from "./safe-plugin";

export class NetworkScannerPlugin extends SafeSimulationPlugin {
  readonly name = "NetworkScannerPlugin";
  protected readonly capability = "network asset inventory planning";
}

export default NetworkScannerPlugin;
