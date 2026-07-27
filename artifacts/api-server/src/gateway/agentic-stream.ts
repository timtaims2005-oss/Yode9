import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { Router, type IRouter, type Request, type Response } from "express";
import type { WebSocket } from "ws";
import { SwarmOrchestrator } from "../core/agentic/swarm-orchestrator";
import type { AgenticRequest, AuthorizedScope } from "../core/agentic/types";
import {
  HeroOrchestratorPlugin,
  JWTSecurityPlugin,
  MonstakFuzzingPlugin,
  NetworkScannerPlugin,
  OmniAuditPlugin,
} from "../core/plugins";
import { ReflectionLoop } from "../core/reasoning/reflection-loop";

export type AgenticEventType =
  | "intent"
  | "delegation"
  | "plugin"
  | "output"
  | "reflection"
  | "complete"
  | "error";

export interface AgenticStreamEvent {
  readonly id: string;
  readonly jobId: string;
  readonly type: AgenticEventType;
  readonly timestamp: string;
  readonly data: unknown;
}

export interface AgenticJob {
  readonly id: string;
  readonly request: AgenticRequest;
  readonly status: "queued" | "running" | "completed" | "blocked" | "error";
  readonly events: readonly AgenticStreamEvent[];
  readonly createdAt: string;
  readonly completedAt?: string;
}

interface MutableJob {
  readonly id: string;
  readonly request: AgenticRequest;
  status: AgenticJob["status"];
  readonly events: AgenticStreamEvent[];
  readonly listeners: Set<(event: AgenticStreamEvent) => void>;
  readonly createdAt: string;
  completedAt?: string;
}

type JsonObject = Readonly<Record<string, unknown>>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRequest(value: unknown): AgenticRequest | undefined {
  if (!isObject(value)) return undefined;
  const intent = value["intent"];
  const mode = value["mode"];
  const input = value["input"];
  const rawScope = value["authorizedScope"];
  if (typeof intent !== "string" || (mode !== "dry-run" && mode !== "simulation") || !isObject(input) || !isObject(rawScope)) {
    return undefined;
  }
  const scopeId = rawScope["id"];
  const actions = rawScope["actions"];
  if (typeof scopeId !== "string" || !Array.isArray(actions) || !actions.every((item): item is string => typeof item === "string")) {
    return undefined;
  }
  const expiresAt = rawScope["expiresAt"];
  const requestedPlugins = value["requestedPlugins"];
  return {
    intent,
    mode,
    input,
    authorizedScope: {
      id: scopeId,
      actions,
      ...(typeof expiresAt === "number" ? { expiresAt } : {}),
    } satisfies AuthorizedScope,
    ...(Array.isArray(requestedPlugins) && requestedPlugins.every((item): item is string => typeof item === "string")
      ? { requestedPlugins }
      : {}),
  };
}

class AgenticJobStore {
  private readonly jobs = new Map<string, MutableJob>();
  private readonly orchestrator = new SwarmOrchestrator([
    new HeroOrchestratorPlugin(),
    new OmniAuditPlugin(),
    new JWTSecurityPlugin(),
    new NetworkScannerPlugin(),
    new MonstakFuzzingPlugin(),
  ]);
  private readonly reflection = new ReflectionLoop();

  create(request: AgenticRequest): AgenticJob {
    const id = randomUUID();
    const job: MutableJob = {
      id,
      request,
      status: "queued",
      events: [],
      listeners: new Set(),
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(id, job);
    void this.execute(job);
    return this.snapshot(job);
  }

  get(id: string): AgenticJob | undefined {
    const job = this.jobs.get(id);
    return job === undefined ? undefined : this.snapshot(job);
  }

  history(): readonly AgenticJob[] {
    return [...this.jobs.values()].map((job) => this.snapshot(job));
  }

  subscribe(id: string, listener: (event: AgenticStreamEvent) => void): (() => void) | undefined {
    const job = this.jobs.get(id);
    if (job === undefined) return undefined;
    for (const event of job.events) listener(event);
    if (job.status === "completed" || job.status === "blocked" || job.status === "error") return () => undefined;
    job.listeners.add(listener);
    return (): void => { job.listeners.delete(listener); };
  }

  private async execute(job: MutableJob): Promise<void> {
    job.status = "running";
    this.emit(job, "intent", { intent: job.request.intent, mode: job.request.mode });
    try {
      const result = await this.reflection.run(job.request, async (request) => {
        const swarm = await this.orchestrator.run(request, {
          onDelegation: (plugin): void => this.emit(job, "delegation", { plugin }),
          onPlugin: (pluginResult): void => this.emit(job, "plugin", pluginResult),
        });
        this.emit(job, "output", swarm);
        return swarm.plugins;
      });
      this.emit(job, "reflection", result.reflection);
      job.status = result.reflection.nextAction === "blocked" ? "blocked" : "completed";
      this.emit(job, "complete", { status: job.status });
    } catch (error: unknown) {
      job.status = "error";
      this.emit(job, "error", { message: error instanceof Error ? error.message : "Agentic execution failed." });
    } finally {
      job.completedAt = new Date().toISOString();
      job.listeners.clear();
    }
  }

  private emit(job: MutableJob, type: AgenticEventType, data: unknown): void {
    const event: AgenticStreamEvent = {
      id: randomUUID(),
      jobId: job.id,
      type,
      timestamp: new Date().toISOString(),
      data,
    };
    job.events.push(event);
    for (const listener of job.listeners) listener(event);
  }

  private snapshot(job: MutableJob): AgenticJob {
    return {
      id: job.id,
      request: job.request,
      status: job.status,
      events: [...job.events],
      createdAt: job.createdAt,
      ...(job.completedAt === undefined ? {} : { completedAt: job.completedAt }),
    };
  }
}

export const agenticJobStore = new AgenticJobStore();
const router: IRouter = Router();

function sendSseEvent(response: Response, event: AgenticStreamEvent): void {
  response.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
}

function sendWebSocketEvent(socket: WebSocket, event: AgenticStreamEvent): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(event));
  }
}

/**
 * WebSocket adapter for the same in-memory job channel used by SSE.
 * The job id is required so a client cannot subscribe to an unspecified stream.
 */
export function handleAgenticSocket(socket: WebSocket, request: IncomingMessage): void {
  const requestUrl = new URL(request.url ?? "/", "http://agentic.local");
  const jobId = requestUrl.searchParams.get("jobId");
  if (jobId === null || agenticJobStore.get(jobId) === undefined) {
    socket.close(4404, "Agentic job not found");
    return;
  }
  const unsubscribe = agenticJobStore.subscribe(jobId, (event) => sendWebSocketEvent(socket, event));
  if (unsubscribe === undefined) {
    socket.close(4404, "Agentic job not found");
    return;
  }
  socket.on("close", unsubscribe);
  socket.on("error", unsubscribe);
}

router.post("/stream", (req: Request, res: Response): void => {
  const request = parseRequest(req.body as unknown);
  if (request === undefined) {
    res.status(400).json({ error: "intent, dry-run/simulation mode, input, and authorizedScope are required." });
    return;
  }
  const job = agenticJobStore.create(request);
  res.status(202).json({ jobId: job.id, status: job.status, streamUrl: `/api/v1/agentic/stream?jobId=${job.id}&stream=true` });
});

router.get("/stream", (req: Request, res: Response): void => {
  const queryJobId = req.query["jobId"];
  const jobId = typeof queryJobId === "string" ? queryJobId : undefined;
  const streamRequested = req.query["stream"] === "true" || req.headers.accept?.includes("text/event-stream") === true;
  if (!streamRequested) {
    const job = jobId === undefined ? undefined : agenticJobStore.get(jobId);
    if (jobId !== undefined && job === undefined) {
      res.status(404).json({ error: "Agentic job not found." });
      return;
    }
    res.json(job === undefined ? { jobs: agenticJobStore.history() } : job);
    return;
  }
  if (jobId === undefined) {
    res.status(400).json({ error: "jobId is required for an SSE stream." });
    return;
  }
  if (agenticJobStore.get(jobId) === undefined) {
    res.status(404).json({ error: "Agentic job not found." });
    return;
  }
  res.status(200).set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  const unsubscribe = agenticJobStore.subscribe(jobId, (event) => sendSseEvent(res, event));
  if (unsubscribe === undefined) return;
  req.on("close", unsubscribe);
});

export default router;
