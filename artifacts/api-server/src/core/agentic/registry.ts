import {
  HeroOrchestratorPlugin,
  JWTSecurityPlugin,
  MonstakFuzzingPlugin,
  NetworkScannerPlugin,
  OmniAuditPlugin,
} from "../plugins";
import type { AgenticPlugin } from "./types";

/**
 * The defensive control plane has one canonical plugin registry.
 * Both Swarm and Jetool must receive the same instances and ordering so
 * diagnostics and live jobs exercise the same five capabilities.
 */
export function createAgenticPluginRegistry(): readonly AgenticPlugin[] {
  return [
    new HeroOrchestratorPlugin(),
    new OmniAuditPlugin(),
    new JWTSecurityPlugin(),
    new NetworkScannerPlugin(),
    new MonstakFuzzingPlugin(),
  ];
}

export const AGENTIC_PLUGIN_NAMES = [
  "HeroOrchestratorPlugin",
  "OmniAuditPlugin",
  "JWTSecurityPlugin",
  "NetworkScannerPlugin",
  "MonstakFuzzingPlugin",
] as const;
