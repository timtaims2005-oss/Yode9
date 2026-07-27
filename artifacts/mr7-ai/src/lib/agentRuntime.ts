/**
 * Unified additive runtime for Arsenal tool-calling and multi-agent workflows.
 *
 * This module intentionally sits above the existing systems. It does not
 * replace registry, chat, memory, skills, approval, or orchestration code.
 * Consumers can opt into one stable API while legacy call sites keep working.
 */

import type { ChatMessage, ChatRequest } from "./chat-client";
import { streamChat } from "./chat-client";
import {
  getFilteredAnthropicToolsParam,
  routeTools,
  type ToolRouterOptions,
} from "./toolRouter";
import { getRegisteredTools } from "./toolsRegistry";
import {
  executeToolSafe,
  processResponseSafe,
  type SafeToolResult,
} from "./toolExecution";
import {
  buildFullMemoryContext,
  STM,
  LTM,
  type STMState,
} from "./agentMemory";
import {
  matchSkillsWithMemoryFixed,
  buildMemoryAwareSkillsAddendumFixed,
  type UserSkill,
} from "./skillsEngine";
import {
  buildDAGPlan,
  executeDAGPlan,
  type DAGPlan,
  type OrchestrationEvent,
} from "./multiAgentOrchestrator";
import { emitAgenticStatus } from "./agenticEvents";
import { runReflexionLoop, type ReflexionVerdict } from "./reflexionEngine";

export type RuntimeOptions = {
  maxTools?: number;
  router?: Omit<ToolRouterOptions, "maxTools">;
  includeMemory?: boolean;
  includeSkills?: boolean;
  validateTools?: boolean;
  approvalGate?: boolean;
  conversationId?: string;
};

export type RuntimeToolContext = {
  userMessage: string;
  conversationContext?: string;
  options?: RuntimeOptions;
};

export type RuntimeToolSelection = {
  tools: ReturnType<typeof getFilteredAnthropicToolsParam>;
  routedToolIds: string[];
  totalToolCount: number;
};

export type RuntimePromptContext = RuntimeToolSelection & {
  promptAddendum: string;
  skills: UserSkill[];
  memory: string;
};

export type RuntimeExecution = {
  hasCalls: boolean;
  cleanedText: string;
  resultsBlock: string;
  results: SafeToolResult[];
  selfHealedCount: number;
  failedCount: number;
  reflexion?: ReflexionVerdict;
};

export type RuntimeSession = {
  id: string;
  userMessage: string;
  selection: RuntimeToolSelection;
  prompt: RuntimePromptContext;
  executeResponse: (text: string) => Promise<RuntimeExecution>;
  runPlan: (
    goal: string,
    onEvent?: (event: OrchestrationEvent) => void,
    signal?: AbortSignal,
  ) => Promise<DAGPlan>;
};

export type RuntimeStreamResult = RuntimeExecution & {
  fullText: string;
  runtime: RuntimeSession;
};

function makeConversationContext(messages: ChatMessage[], explicit?: string): string {
  if (explicit) return explicit;
  return messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.content.slice(0, 600)}`)
    .join("\n");
}

function countRegisteredTools(): number {
  return getRegisteredTools().length;
}

/**
 * Selects the Anthropic-compatible tool payload for one request.
 * The complete registry is never sent through this function.
 */
export function selectRuntimeTools(
  context: RuntimeToolContext,
): RuntimeToolSelection {
  const maxTools = Math.max(1, Math.min(context.options?.maxTools ?? 10, 32));
  const routerOptions: ToolRouterOptions = {
    ...(context.options?.router ?? {}),
    maxTools,
  };
  const routed = routeTools(
    context.userMessage,
    context.conversationContext ?? "",
    routerOptions,
  );
  emitAgenticStatus({
    type: "planning",
    message: `Selected ${routed.length} relevant tools from ${countRegisteredTools()}.`,
    ts: Date.now(),
  });
  routed.forEach(({ tool }) => emitAgenticStatus({
    type: "tool",
    toolId: tool.moduleId,
    status: "selected",
    ts: Date.now(),
  }));
  const tools = getFilteredAnthropicToolsParam(
    context.userMessage,
    context.conversationContext,
    routerOptions,
  );

  return {
    tools,
    routedToolIds: routed.map(({ tool }) => tool.moduleId),
    totalToolCount: countRegisteredTools(),
  };
}

/**
 * Builds one bounded prompt context from tools, matching skills, and memory.
 */
export async function buildRuntimePrompt(
  context: RuntimeToolContext,
): Promise<RuntimePromptContext> {
  const options = context.options ?? {};
  const selection = selectRuntimeTools(context);
  const skills = options.includeSkills === false
    ? []
    : await matchSkillsWithMemoryFixed(context.userMessage, 3, true);
  const memory = options.includeMemory === false
    ? ""
    : buildFullMemoryContext({ includeSTM: true, includeLTM: true });
  if (memory) {
    emitAgenticStatus({
      type: "memory",
      message: "Short-term and long-term memory recalled for this request.",
      ts: Date.now(),
    });
  }
  const skillBlock = options.includeSkills === false
    ? ""
    : await buildMemoryAwareSkillsAddendumFixed(context.userMessage, 3);
  const toolBlock = selection.tools.length > 0
    ? `\n\n[SELECTED TOOLS — ${selection.tools.length}/${selection.totalToolCount}]\n` +
      selection.tools.map((tool) => `- ${tool.name}: ${tool.description}`).join("\n")
    : "";

  return {
    ...selection,
    promptAddendum: `${skillBlock}${memory ? `\n\n${memory}` : ""}${toolBlock}`,
    skills,
    memory,
  };
}

/**
 * Executes a single call through validation, self-healing, approval, and memory.
 */
export async function executeRuntimeTool(
  toolId: string,
  input: Record<string, unknown>,
  options: RuntimeOptions = {},
): Promise<SafeToolResult> {
  return executeToolSafe(toolId, input, {
    skipValidation: options.validateTools === false,
    skipApproval: options.approvalGate === false,
    conversationId: options.conversationId,
  });
}

/**
 * Creates a request-scoped runtime. This is the recommended integration point
 * for new chat surfaces, skills, sidebar actions, and agent entry points.
 */
export async function createAgentRuntime(
  request: Pick<ChatRequest, "messages"> & RuntimeToolContext,
): Promise<RuntimeSession> {
  const conversationContext = makeConversationContext(
    request.messages,
    request.conversationContext,
  );
  const context: RuntimeToolContext = {
    ...request,
    conversationContext,
  };
  const prompt = await buildRuntimePrompt(context);
  const id = `runtime-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  STM.setContext("activeRuntimeId", id);
  STM.setContext("activeToolIds", prompt.routedToolIds);
  STM.setContext("activeSkillNames", prompt.skills.map((skill) => skill.name));

  const executeResponse = async (text: string): Promise<RuntimeExecution> => {
    emitAgenticStatus({
      type: "agent",
      agent: "Executor",
      message: "Processing model tool calls through the safe execution pipeline.",
      ts: Date.now(),
    });
    const result = await processResponseSafe(text, {
      skipValidation: context.options?.validateTools === false,
      skipApproval: context.options?.approvalGate === false,
      conversationId: context.options?.conversationId ?? id,
    });
    const selfHealedCount = result.results.filter((item) => item.selfHealed).length;
    const failedCount = result.results.filter((item) => !item.ok).length;
    result.results.forEach((item) => emitAgenticStatus({
      type: "tool",
      toolId: item.toolId,
      status: item.ok ? "done" : "error",
      ts: Date.now(),
    }));
    const reviewed = await runReflexionLoop({
      output: result.results.map((item) => ({
        toolId: item.toolId,
        ok: item.ok,
        result: item.result,
      })),
      expected: "All tool results should be present and successful where possible.",
    });
    emitAgenticStatus({
      type: "reflexion",
      passed: reviewed.verdict.passed,
      score: reviewed.verdict.score,
      ts: Date.now(),
    });
    STM.setContext("lastRuntimeToolCount", result.results.length);
    STM.setContext("lastRuntimeFailures", failedCount);
    return { ...result, selfHealedCount, failedCount, reflexion: reviewed.verdict };
  };

  const runPlan = async (
    goal: string,
    onEvent?: (event: OrchestrationEvent) => void,
    signal?: AbortSignal,
  ): Promise<DAGPlan> => {
    emitAgenticStatus({
      type: "agent",
      agent: "Planner",
      message: `Building a DAG execution plan for: ${goal.slice(0, 120)}`,
      ts: Date.now(),
    });
    const plan = buildDAGPlan(goal, request.userMessage,);
    STM.setContext("activePlanId", plan.id);
    const executed = await executeDAGPlan(plan, (event) => {
      if (event.type === "node_start") {
        emitAgenticStatus({
          type: "agent",
          agent: event.label,
          message: "Agent node is running.",
          ts: Date.now(),
        });
      } else if (event.type === "node_done") {
        emitAgenticStatus({
          type: "agent",
          agent: event.nodeId,
          message: "Agent node completed.",
          ts: Date.now(),
        });
      } else if (event.type === "node_error") {
        emitAgenticStatus({
          type: "agent",
          agent: event.nodeId,
          message: event.error,
          ts: Date.now(),
        });
      }
      onEvent?.(event);
    }, signal);
    emitAgenticStatus({
      type: "agent",
      agent: "Reviewer",
      message: `Reviewed plan ${plan.id}: ${executed.status}`,
      ts: Date.now(),
    });
    LTM.addUserFact(`Completed agent runtime task: ${goal.slice(0, 100)}`, 0.6, "agent-runtime");
    STM.clearContext("activePlanId");
    return executed;
  };

  return { id, userMessage: request.userMessage, selection: prompt, prompt, executeResponse, runPlan };
}

/**
 * Full request-scoped streaming path for new chat/skill surfaces.
 *
 * `enableTools` is deliberately disabled because the legacy chat client adds
 * its unfiltered registry when that flag is enabled. The selected tool
 * contract is already present in the bounded runtime prompt.
 */
export async function streamWithAgentRuntime(
  request: ChatRequest & { userMessage: string; options?: RuntimeOptions },
  onChunk: (text: string) => void,
  onToolResult?: (result: SafeToolResult) => void,
  signal?: AbortSignal,
): Promise<RuntimeStreamResult> {
  const runtime = await createAgentRuntime({
    messages: request.messages,
    userMessage: request.userMessage,
    conversationContext: request.messages
      .slice(-8)
      .map((message) => `${message.role}: ${message.content.slice(0, 600)}`)
      .join("\n"),
    options: request.options,
  });

  const boundedRequest: ChatRequest = {
    ...request,
    customSystemPrompt: [
      request.customSystemPrompt ?? "",
      runtime.prompt.promptAddendum,
    ].filter(Boolean).join("\n\n"),
    enableTools: false,
  };

  let fullText = "";
  await streamChat(boundedRequest, (chunk) => {
    fullText += chunk;
    onChunk(chunk);
  }, signal);

  const execution = await runtime.executeResponse(fullText);
  execution.results.forEach((result) => onToolResult?.(result));

  return { ...execution, fullText, runtime };
}

/**
 * Convenience helper for UI and chat adapters that already have a message list.
 */
export async function prepareRuntimeRequest(
  messages: ChatMessage[],
  userMessage: string,
  options?: RuntimeOptions,
): Promise<{ runtime: RuntimeSession; request: ChatRequest }> {
  const runtime = await createAgentRuntime({ messages, userMessage, options });
  const request: ChatRequest = {
    model: "",
    persona: null,
    messages,
    customInstructions: "",
    language: "en",
    memory: [],
    customSystemPrompt: runtime.prompt.promptAddendum,
    enableTools: false,
  };
  return { runtime, request };
}

export function getRuntimeMemorySnapshot(): {
  stm: Readonly<STMState>;
  ltmContext: string;
} {
  return {
    stm: STM.getState(),
    ltmContext: buildFullMemoryContext({ includeSTM: false, includeLTM: true }),
  };
}