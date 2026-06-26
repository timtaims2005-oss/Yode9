import type { WebSocket } from "ws";
import { logger } from "../lib/logger";

interface MuxRequest {
  id: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  ping?: number;
}

const PORT = Number(process.env["PORT"] ?? 8080);
const BASE = `http://127.0.0.1:${PORT}`;

export function handleMuxSocket(ws: WebSocket): void {
  ws.on("message", async (raw) => {
    let req: MuxRequest;
    try {
      req = JSON.parse(raw.toString()) as MuxRequest;
    } catch {
      return;
    }
    if (req.ping) return;

    try {
      const targetUrl = `${BASE}${req.url}`;
      const fetchInit: RequestInit = {
        method: req.method,
        headers: req.headers as Record<string, string>,
      };
      if (req.body && req.method !== "GET" && req.method !== "HEAD") {
        fetchInit.body = req.body;
      }

      const resp = await fetch(targetUrl, fetchInit);
      const body = await resp.text();
      const headers: Record<string, string> = {};
      resp.headers.forEach((v, k) => { headers[k] = v; });

      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ id: req.id, status: resp.status, headers, body }));
      }
    } catch (err) {
      logger.debug({ err, id: req.id }, "[mux] request error");
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          id: req.id,
          status: 503,
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ error: "mux upstream failed" }),
        }));
      }
    }
  });

  ws.on("error", (err) => {
    logger.debug({ err }, "[mux] ws error");
  });
}
