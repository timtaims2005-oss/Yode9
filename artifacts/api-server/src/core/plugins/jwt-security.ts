import { SafeSimulationPlugin } from "./safe-plugin";

export class JWTSecurityPlugin extends SafeSimulationPlugin {
  readonly name = "JWTSecurityPlugin";
  protected readonly capability = "JWT configuration review";
}

export default JWTSecurityPlugin;
