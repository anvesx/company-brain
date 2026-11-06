import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type pg from "pg";
import { healthHandler } from "./health.js";

type Handler = (req: IncomingMessage, res: ServerResponse) => void;
/** The parts that need the database to start. Until they exist the server answers 503, but keeps running. */
export interface Parts {
  brain: Handler;
  identity: Handler;
}

/** One request handler for the whole server: health first, then identity's paths, then the brain's own routes. */
export function mount(pool: pg.Pool, parts: () => Parts | undefined): Handler {
  const health = healthHandler(pool, () => parts() !== undefined); // "ready" means both handlers below exist
  return (req, res) => {
    const path = new URL(req.url ?? "/", "http://x").pathname;
    if (path === "/healthz") return void health(req, res);
    const ready = parts();
    if (!ready) return void res.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ status: "unavailable" }));
    const identity = path.startsWith("/api/auth/") || path.startsWith("/.well-known/");
    (identity ? ready.identity : ready.brain)(req, res);
  };
}

/**
 * Keep-alive limits, set above every proxy in front of the process. A server that closes an idle socket before its proxy
 * does lets the proxy reuse a dead connection (a 502 or ECONNRESET). Node's default is 5 s. Google's external load balancer
 * keeps backend connections idle for up to 600 s and AWS ALB for 60 s (docs/specs/infra/deploy.md), so: keepAliveTimeout
 * 620 s, and headersTimeout 5 s above it as the Node docs require. requestTimeout stays at its 300 s default, Cloud Run's own.
 */
export const KEEP_ALIVE_MS = 620_000;
export function tune<S extends Pick<Server, "keepAliveTimeout" | "headersTimeout">>(server: S): S {
  server.keepAliveTimeout = KEEP_ALIVE_MS;
  server.headersTimeout = KEEP_ALIVE_MS + 5_000;
  return server;
}
