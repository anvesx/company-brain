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
 * Keep-alive limit, set above every proxy in front of the process. A server that closes an idle socket before its proxy
 * does lets the proxy reuse a dead connection (a 502 or ECONNRESET). Node's default is 5 s. Google's external load balancer
 * keeps backend connections idle for up to 600 s and AWS ALB for 60 s (docs/specs/infra/deploy.md), so keepAliveTimeout is
 * 620 s. Only this value is raised. headersTimeout (60 s) bounds how long a client may take to send one request's headers,
 * not how long an idle socket lives, and Node requires it to stay at or under requestTimeout (300 s, Cloud Run's default
 * request timeout too): raising it to 625 s would widen the slowloris window five-fold, and `createServer` rejects it.
 */
export const KEEP_ALIVE_MS = 620_000;
export function tune<S extends Pick<Server, "keepAliveTimeout">>(server: S): S {
  server.keepAliveTimeout = KEEP_ALIVE_MS;
  return server;
}
