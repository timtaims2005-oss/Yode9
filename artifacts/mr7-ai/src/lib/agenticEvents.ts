export type AgenticStatus =
  | { type: "planning"; message: string; ts: number }
  | { type: "agent"; agent: string; message: string; ts: number }
  | { type: "memory"; message: string; ts: number }
  | { type: "tool"; toolId: string; status: "selected" | "running" | "done" | "error"; ts: number }
  | { type: "reflexion"; passed: boolean; score: number; ts: number };

type Listener = (event: AgenticStatus) => void;
const listeners = new Set<Listener>();
let latest: AgenticStatus | null = null;

export function onAgenticStatus(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitAgenticStatus(event: AgenticStatus): void {
  latest = event;
  listeners.forEach((listener) => {
    try { listener(event); } catch { /* UI observers must not break execution */ }
  });
}

export function getLatestAgenticStatus(): AgenticStatus | null {
  return latest;
}
