// ── Data Transfer Objects ────────────────────────────────────────────────────
// These are the shapes used at API boundaries (request/response bodies)

export interface CreateArtifactDTO {
  conversationId: string;
  title: string;
  content: string;
  language?: string;
}

export interface ArtifactResponseDTO {
  id: string;
  conversationId: string;
  userId: string;
  title: string;
  content: string;
  language: string;
  metadata: {
    lines: number;
    complexity: 'simple' | 'moderate' | 'complex';
    runnable: boolean;
    hasTests: boolean;
    hasAsync: boolean;
    estimatedExecutionTime: number;
  };
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExecuteCodeDTO {
  code: string;
  language: 'javascript' | 'python';
}

export interface ExecutionResultDTO {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTimeMs: number;
  timedOut: boolean;
}

export interface InferenceRequestDTO {
  prompt: string;
  systemPrompt?: string;
  image?: string;
  expectedOutput?: 'text' | 'json' | 'code' | 'markdown';
  maxTokens?: number;
  temperature?: number;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  modelPreference?: string;
}

export interface AIStatsDTO {
  registeredModels: number;
  totalRequests: number;
  totalTokensUsed: number;
  cacheSize: number;
  modelHealth: Record<string, { health: number; state: string }>;
}

export interface EncryptDTO {
  plaintext: string;
  context?: string;
}

export interface DecryptDTO {
  encrypted: string;
  salt: string;
  iv: string;
  authTag: string;
  version: number;
  contextHash?: string;
  expectedContext?: string;
}
