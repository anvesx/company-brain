import type { IncomingMessage, ServerResponse } from "node:http";
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
