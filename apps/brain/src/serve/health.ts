import type { IncomingMessage, ServerResponse } from "node:http";
import type pg from "pg";

/** How long `select 1` may take before the database counts as down. */
export const HEALTH_TIMEOUT_MS = 2000;

/** True when the database answers `select 1` in time. Never throws, so a dead database cannot crash the server. */
export async function databaseUp(pool: pg.Pool, timeoutMs = HEALTH_TIMEOUT_MS): Promise<boolean> {
  let timer: NodeJS.Timeout | undefined;
  const late = new Promise<never>((_, no) => {
    timer = setTimeout(() => no(new Error("health check timed out")), timeoutMs);
  });
  try {
    await Promise.race([pool.query("select 1"), late]);
    return true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** `GET /healthz`: 200 `{"status":"ok"}` while the database answers, 503 `{"status":"unavailable"}` while it does not. No auth. */
export const healthHandler = (pool: pg.Pool) => async (_req: IncomingMessage, res: ServerResponse) => {
  const up = await databaseUp(pool);
  res.writeHead(up ? 200 : 503, { "content-type": "application/json" }).end(JSON.stringify({ status: up ? "ok" : "unavailable" }));
};
