/**
 * AI Streaming Optimizer for Yode9 / MR7.AI
 * ===========================================
 * تحسين الـ Streaming للمحادثات في الوقت الفعلي
 */

export interface StreamChunk {
  content: string;
  tokenCount?: number;
  isLast: boolean;
  timestamp: number;
}

export interface StreamOptions {
  bufferSize?: number;
  flushIntervalMs?: number;
  onChunk?: (chunk: StreamChunk) => void;
  onComplete?: (fullContent: string, totalTokens: number) => void;
  onError?: (error: Error) => void;
}

export class AIStreamingOptimizer {
  static async processStream(
    stream: AsyncIterable<string>,
    options: StreamOptions = {}
  ): Promise<string> {
    const {
      bufferSize = 5,
      onChunk,
      onComplete,
      onError,
    } = options;

    let buffer: string[] = [];
    let fullContent = '';
    let totalTokens = 0;

    try {
      for await (const token of stream) {
        buffer.push(token);
        fullContent += token;
        totalTokens++;

        if (buffer.length >= bufferSize) {
          const chunk: StreamChunk = {
            content: buffer.join(''),
            tokenCount: buffer.length,
            isLast: false,
            timestamp: Date.now(),
          };
          onChunk?.(chunk);
          buffer = [];
        }
      }

      if (buffer.length > 0) {
        const chunk: StreamChunk = {
          content: buffer.join(''),
          tokenCount: buffer.length,
          isLast: true,
          timestamp: Date.now(),
        };
        onChunk?.(chunk);
      }

      onComplete?.(fullContent, totalTokens);
      return fullContent;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      throw err;
    }
  }

  static createSSEResponse(content: string): string {
    return `data: ${JSON.stringify({ content, done: false })}\n\n`;
  }

  static createSSEDoneEvent(): string {
    return `data: ${JSON.stringify({ content: '', done: true })}\n\n`;
  }

  static createSSEErrorEvent(error: string): string {
    return `data: ${JSON.stringify({ error, done: true })}\n\n`;
  }

  static compressTokens(tokens: string[]): string {
    return tokens
      .map(t => t.replace(/\s+/g, ' '))
      .join('')
      .trim();
  }

  static estimateTokenCount(text: string): number {
    return Math.ceil(text.split(/\s+/).length * 1.3);
  }

  static formatStreamStats(stats: {
    startTime: number;
    endTime: number;
    totalTokens: number;
    model: string;
  }): string {
    const durationMs = stats.endTime - stats.startTime;
    const tokensPerSec = Math.round((stats.totalTokens / durationMs) * 1000);
    return `Model: ${stats.model} | Tokens: ${stats.totalTokens} | Speed: ${tokensPerSec} t/s | Time: ${durationMs}ms`;
  }
}

export interface StreamSession {
  id: string;
  userId: string;
  model: string;
  provider: string;
  startTime: number;
  tokensGenerated: number;
  isActive: boolean;
}

const activeSessions = new Map<string, StreamSession>();

export function registerStreamSession(session: StreamSession): void {
  activeSessions.set(session.id, session);
}

export function updateStreamSession(id: string, updates: Partial<StreamSession>): void {
  const session = activeSessions.get(id);
  if (session) {
    activeSessions.set(id, { ...session, ...updates });
  }
}

export function endStreamSession(id: string): StreamSession | undefined {
  const session = activeSessions.get(id);
  if (session) {
    activeSessions.delete(id);
  }
  return session;
}

export function getActiveSessionCount(): number {
  return activeSessions.size;
}
