/**
 * =====================================================================
 * index.ts — نقطة الدخول الموحدة لنظام Tool Calling
 * artifacts/api-server/src/lib/ai/index.ts
 * =====================================================================
 */

import { ToolContext } from "./tool-orchestrator-v2.js";
import { chatWithToolsRobust, streamFinalResponse, getSystemMetrics, RateLimitError } from "./tool-orchestrator-v3-layers.js";

export { RateLimitError, getSystemMetrics };
export type { ToolContext };

interface IncomingChatMessage { role: "system" | "user" | "assistant" | "tool"; content: string; }

/**
 * نقطة الدخول الرئيسية — جمع: rate limiting + cache + fallback + tool execution
 */
export async function handleChat(params: {
  userId: string;
  accountId: string;
  apiToken: string;
  preferredModel?: string;
  messages: IncomingChatMessage[];
  githubToken?: string;
  getFileBuffer?: (fileId: string) => Promise<Buffer>;
  useCache?: boolean;
}) {
  const ctx: ToolContext = {
    userId: params.userId,
    accountId: params.accountId,
    apiToken: params.apiToken,
    extras: { githubToken: params.githubToken, getFileBuffer: params.getFileBuffer },
  };

  return chatWithToolsRobust(
    ctx,
    params.preferredModel ?? "llama-3.3-70b-versatile",
    params.messages,
    { useCache: params.useCache ?? false }
  );
}

/**
 * نسخة SSE لبث الرد تدريجياً — تُستخدم من /api/chat عند useTools: true
 */
export async function* handleChatStream(params: Parameters<typeof handleChat>[0]) {
  const ctx: ToolContext = {
    userId: params.userId,
    accountId: params.accountId,
    apiToken: params.apiToken,
    extras: { githubToken: params.githubToken, getFileBuffer: params.getFileBuffer },
  };
  yield* streamFinalResponse(
    ctx,
    params.preferredModel ?? "llama-3.3-70b-versatile",
    params.messages,
    { chunkSize: 24, delayMs: 15 }
  );
}
