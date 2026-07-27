import { assessRequestSafety } from "./safety";
import type { AgenticPlugin, AgenticRequest, PluginResult } from "./types";

export interface JetoolResult {
  readonly status: "simulated" | "blocked";
  readonly plan: readonly string[];
  readonly outputs: readonly PluginResult[];
  readonly blockedActions: readonly string[];
  readonly schema: JetoolSchema;
  readonly pipelineArtifacts: readonly PipelineArtifact[];
  readonly validationReport: SchemaValidationReport;
}

export interface JetoolSchema {
  readonly version: "1.0";
  readonly inputSchema: Readonly<Record<string, SchemaField>>;
  readonly outputSchema: Readonly<Record<string, SchemaField>>;
}

export interface SchemaField {
  readonly type: "string" | "number" | "boolean" | "array" | "object";
  readonly required: boolean;
  readonly description: string;
  readonly enum?: readonly string[];
}

export interface PipelineArtifact {
  readonly id: string;
  readonly sourcePlugin: string;
  readonly artifactType: "findings" | "telemetry" | "plan" | "schema";
  readonly findingCount: number;
  readonly passedsTo: readonly string[];
}

export interface SchemaValidationReport {
  readonly valid: boolean;
  readonly checkedFields: readonly string[];
  readonly violations: readonly SchemaViolation[];
  readonly warningCount: number;
}

export interface SchemaViolation {
  readonly field: string;
  readonly expected: string;
  readonly actual: string;
  readonly severity: "error" | "warning";
}

/** Strict JSON Schema for AgenticRequest validation */
const AGENTIC_REQUEST_SCHEMA: JetoolSchema = {
  version: "1.0",
  inputSchema: {
    intent: {
      type: "string",
      required: true,
      description: "Human-readable description of the defensive goal",
    },
    mode: {
      type: "string",
      required: true,
      description: "Execution mode — only dry-run or simulation permitted",
      enum: ["dry-run", "simulation"],
    },
    "authorizedScope.id": {
      type: "string",
      required: true,
      description: "Unique identifier for the authorized operation scope",
    },
    "authorizedScope.actions": {
      type: "array",
      required: true,
      description: "List of explicitly authorized actions",
    },
    requestedPlugins: {
      type: "array",
      required: false,
      description: "Optional list of specific plugin names to activate",
    },
  },
  outputSchema: {
    plugin: {
      type: "string",
      required: true,
      description: "Name of the plugin that produced this result",
    },
    status: {
      type: "string",
      required: true,
      description: "Execution status",
      enum: ["simulated", "blocked"],
    },
    findings: {
      type: "array",
      required: true,
      description: "Array of PluginFinding objects",
    },
    telemetry: {
      type: "object",
      required: true,
      description: "Execution telemetry including timing and action lists",
    },
    blockedActions: {
      type: "array",
      required: true,
      description: "Actions that were blocked by the safety control plane",
    },
    explanation: {
      type: "string",
      required: true,
      description: "Human-readable explanation of plugin execution result",
    },
  },
};

function validateRequestSchema(request: AgenticRequest): SchemaValidationReport {
  const violations: SchemaViolation[] = [];
  const checkedFields: string[] = [];

  // Validate intent
  checkedFields.push("intent");
  if (typeof request.intent !== "string" || request.intent.trim().length === 0) {
    violations.push({ field: "intent", expected: "non-empty string", actual: typeof request.intent, severity: "error" });
  }

  // Validate mode
  checkedFields.push("mode");
  if (request.mode !== "dry-run" && request.mode !== "simulation") {
    violations.push({
      field: "mode",
      expected: "\"dry-run\" | \"simulation\"",
      actual: String(request.mode),
      severity: "error",
    });
  }

  // Validate authorizedScope
  checkedFields.push("authorizedScope.id");
  if (typeof request.authorizedScope?.id !== "string" || request.authorizedScope.id.trim() === "") {
    violations.push({ field: "authorizedScope.id", expected: "non-empty string", actual: String(request.authorizedScope?.id), severity: "error" });
  }

  checkedFields.push("authorizedScope.actions");
  if (!Array.isArray(request.authorizedScope?.actions) || request.authorizedScope.actions.length === 0) {
    violations.push({ field: "authorizedScope.actions", expected: "non-empty array", actual: "empty or non-array", severity: "error" });
  }

  // Validate requestedPlugins (optional)
  if (request.requestedPlugins !== undefined) {
    checkedFields.push("requestedPlugins");
    if (!Array.isArray(request.requestedPlugins)) {
      violations.push({ field: "requestedPlugins", expected: "array or undefined", actual: typeof request.requestedPlugins, severity: "warning" });
    }
  }

  // Warn on very short intent strings (likely low-quality requests)
  if (typeof request.intent === "string" && request.intent.length < 10) {
    violations.push({
      field: "intent",
      expected: "descriptive string ≥10 characters",
      actual: `${request.intent.length} characters`,
      severity: "warning",
    });
  }

  return {
    valid: violations.filter((v) => v.severity === "error").length === 0,
    checkedFields,
    violations,
    warningCount: violations.filter((v) => v.severity === "warning").length,
  };
}

function validatePluginOutput(result: PluginResult): SchemaViolation[] {
  const violations: SchemaViolation[] = [];

  if (typeof result.plugin !== "string" || result.plugin.trim() === "") {
    violations.push({ field: "plugin", expected: "string", actual: typeof result.plugin, severity: "error" });
  }
  if (result.status !== "simulated" && result.status !== "blocked") {
    violations.push({ field: "status", expected: '"simulated" | "blocked"', actual: String(result.status), severity: "error" });
  }
  if (!Array.isArray(result.findings)) {
    violations.push({ field: "findings", expected: "array", actual: typeof result.findings, severity: "error" });
  }
  if (typeof result.explanation !== "string") {
    violations.push({ field: "explanation", expected: "string", actual: typeof result.explanation, severity: "warning" });
  }

  return violations;
}

function buildPipelineArtifacts(
  outputs: readonly PluginResult[],
  pluginPlan: readonly string[],
): readonly PipelineArtifact[] {
  return outputs.map((result, index) => {
    const nextPlugin = pluginPlan[index + 1] ?? "output-sink";
    return {
      id: `artifact-${result.plugin.toLowerCase().replaceAll(/[^a-z0-9]/g, "-")}-${index}`,
      sourcePlugin: result.plugin,
      artifactType: "findings" as const,
      findingCount: result.findings.length,
      passedsTo: [nextPlugin, "validation-layer", "reporter-agent"],
    };
  });
}

/**
 * JetoolOrchestrator — Zero-latency tool orchestrator with:
 * - Strict JSON Schema validation on inputs AND outputs
 * - Dynamic parameter synthesis from request context
 * - Pipeline artifact passing between plugins
 * - Streaming-compatible plan execution (each plugin result is emittable)
 */
export class JetoolOrchestrator {
  constructor(private readonly plugins: readonly AgenticPlugin[] = []) {}

  /**
   * Plan-oriented execution: validates schema, synthesizes parameters,
   * runs plugins, validates outputs, and builds pipeline artifacts.
   */
  async plan(request: AgenticRequest): Promise<JetoolResult> {
    // Phase 1: Strict input schema validation
    const validationReport = validateRequestSchema(request);

    // Phase 2: Safety assessment
    const safety = assessRequestSafety(request);
    if (!safety.allowed) {
      return {
        status: "blocked",
        plan: [],
        outputs: [],
        blockedActions: [safety.reason],
        schema: AGENTIC_REQUEST_SCHEMA,
        pipelineArtifacts: [],
        validationReport,
      };
    }

    if (!validationReport.valid) {
      return {
        status: "blocked",
        plan: [],
        outputs: [],
        blockedActions: [`Schema validation failed: ${validationReport.violations.filter((v) => v.severity === "error").map((v) => v.field).join(", ")}`],
        schema: AGENTIC_REQUEST_SCHEMA,
        pipelineArtifacts: [],
        validationReport,
      };
    }

    // Phase 3: Dynamic parameter synthesis — select plugins based on intent analysis
    const selected = this.synthesizePluginSelection(request);

    // Phase 4: Execute each plugin, validate output schema, pass artifacts
    const outputs: PluginResult[] = [];
    const outputViolations: SchemaViolation[] = [];

    for (const plugin of selected) {
      const result = await plugin.run({ request });
      const violations = validatePluginOutput(result);
      outputViolations.push(...violations);
      outputs.push(result);
    }

    // Phase 5: Build pipeline artifacts (findings passed between stages)
    const pluginPlan = selected.map((p) => `simulate:${p.name}`);
    const pipelineArtifacts = buildPipelineArtifacts(outputs, pluginPlan);

    const combinedReport: SchemaValidationReport = {
      valid: outputViolations.filter((v) => v.severity === "error").length === 0,
      checkedFields: [
        ...validationReport.checkedFields,
        ...outputs.flatMap((o) => ["plugin", "status", "findings", "explanation"].map((f) => `${o.plugin}.${f}`)),
      ],
      violations: [...validationReport.violations, ...outputViolations],
      warningCount: validationReport.warningCount + outputViolations.filter((v) => v.severity === "warning").length,
    };

    return {
      status: "simulated",
      plan: pluginPlan,
      outputs,
      blockedActions: outputs.flatMap((o) => o.blockedActions),
      schema: AGENTIC_REQUEST_SCHEMA,
      pipelineArtifacts,
      validationReport: combinedReport,
    };
  }

  async execute(request: AgenticRequest): Promise<JetoolResult> {
    return this.plan(request);
  }

  /**
   * Dynamic parameter synthesis: analyze intent and scope to select the
   * minimal sufficient plugin set, rather than running all plugins blindly.
   */
  private synthesizePluginSelection(request: AgenticRequest): readonly AgenticPlugin[] {
    const { requestedPlugins } = request;
    if (requestedPlugins !== undefined && requestedPlugins.length > 0) {
      return this.plugins.filter((p) => requestedPlugins.includes(p.name));
    }

    const intentLower = request.intent.toLowerCase();
    const hasNetworkKeywords = /network|port|scan|asset|subnet|topology/.test(intentLower);
    const hasAuthKeywords = /jwt|token|auth|crypto|credential|identity/.test(intentLower);
    const hasFuzzKeywords = /fuzz|payload|inject|mutation|stress|input/.test(intentLower);
    const hasAuditKeywords = /audit|vuln|cve|owasp|surface|review|assess/.test(intentLower);

    // If no specific keywords, run all plugins
    if (!hasNetworkKeywords && !hasAuthKeywords && !hasFuzzKeywords && !hasAuditKeywords) {
      return this.plugins;
    }

    return this.plugins.filter((p) => {
      const name = p.name.toLowerCase();
      if (hasNetworkKeywords && name.includes("network")) return true;
      if (hasAuthKeywords && name.includes("jwt")) return true;
      if (hasFuzzKeywords && name.includes("monstak")) return true;
      if (hasAuditKeywords && name.includes("omni")) return true;
      if (name.includes("hero")) return true; // always include orchestrator
      return false;
    });
  }
}

export default JetoolOrchestrator;
