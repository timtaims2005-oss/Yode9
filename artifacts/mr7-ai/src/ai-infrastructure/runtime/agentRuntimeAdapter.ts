import {
  createAgentRuntime,
  type RuntimeOptions,
  type RuntimeSession,
} from "../../lib/agentRuntime";
import type { ChatMessage } from "../../lib/chat-client";
import type { MemoryRecord, VectorStore } from "./vectorMemory";

/**
 * Opt-in bridge for existing chat surfaces. Legacy callers remain untouched;
 * new callers can use the infrastructure contract and still reuse the
 * established tool router, skills, approval, memory, and DAG runtime.
 */
export async function createInfrastructureRuntime(
  messages: ChatMessage[],
  userMessage: string,
  options?: RuntimeOptions,
): Promise<RuntimeSession> {
  return createAgentRuntime({ messages, userMessage, options });
}

export async function recallInfrastructureMemory(
  store: VectorStore,
  query: string,
  limit = 8,
): Promise<MemoryRecord[]> {
  return store.search(query, limit);
}
