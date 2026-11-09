import type { Server } from "node:http";
import { createPostgresGraphStore } from "@anvesx/graph-store";
import { createIdentity, migrateDatabase } from "@anvesx/identity";
import type pg from "pg";

/** Error codes that mean "the database is not there yet, or not there right now": worth retrying.
 * 42P07 is "relation already exists": another instance is creating the same table at this moment. */
const RETRY_CODES = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "42P07"]);
// pg gives these two no code: its own connect timeout, and a socket cut in the middle of a query.
const RETRY_MESSAGES = /timeout exceeded when trying to connect|connection terminated/i;

/** True when waiting and trying again can fix `e`. Anything else (wrong password, a bug, bad config) is permanent. */
export function isTransient(e: unknown, depth = 0): boolean {
  if (!(e instanceof Error) || depth > 5) return false;
  const code = (e as { code?: unknown }).code;
  if (typeof code === "string" && (code.startsWith("08") || code.startsWith("57P") || RETRY_CODES.has(code))) return true; // 08xxx: connection exception; 57Pxx: server shutting down or starting up
  if (RETRY_MESSAGES.test(e.message)) return true;
  return isTransient(e.cause, depth + 1); // a wrapper error may hide the connection error underneath
}

/** Starts `server` on host:port. A taken port rejects with `port N in use` instead of crashing with a raw stack trace. */
export const listenOn = (server: Server, host: string, port: number): Promise<void> =>
  new Promise((ok, no) => {
    server.once("error", (e: NodeJS.ErrnoException) => no(e.code === "EADDRINUSE" ? new Error(`port ${port} in use`) : e));
    server.listen(port, host, ok);
  });

type Config = Parameters<typeof migrateDatabase>[0];

/**
 * Runs identity's migrations while holding a Postgres advisory lock, so two instances starting together take
 * turns instead of both running `CREATE TABLE` (the loser would fail with "already exists").
 * The graph store locks 7410001 for its own tables; this one uses 7410002 so the two never wait on each other.
 */
export async function migrateLocked(pool: pg.Pool, config: Config): Promise<void> {
  const c = await pool.connect();
  c.on("error", () => undefined); // a connection killed mid-way also emits 'error'; the failed query already rejects
  try {
    await c.query("BEGIN");
    await c.query("SELECT pg_advisory_xact_lock(7410002)"); // held until COMMIT or ROLLBACK
    await migrateDatabase(config); // runs on other pool connections while this one holds the lock
    await c.query("COMMIT");
    c.release();
  } catch (e) {
    await c.query("ROLLBACK").catch(() => undefined); // the connection may already be dead
    c.release(e as Error); // passing the error makes the pool throw this connection away
    throw e;
  }
}

const need = (env: NodeJS.ProcessEnv, key: string): string => {
  const v = env[key];
  if (!v) throw new Error(`${key} is required`);
  return v;
};

/** Reads and checks the env `serve` needs. Every problem throws one plain message, so a typo fails at once instead of retrying forever. */
export function readEnv(env: NodeJS.ProcessEnv) {
  const databaseUrl = need(env, "DATABASE_URL");
  const url = URL.canParse(databaseUrl) ? new URL(databaseUrl) : undefined;
  if (!url || !/^postgres(ql)?:$/.test(url.protocol) || !url.hostname) throw new Error("DATABASE_URL must be a postgres:// or postgresql:// URL with a host");
  const secret = need(env, "BRAIN_AUTH_SECRET");
  if (secret.length < 32) throw new Error("BRAIN_AUTH_SECRET must be at least 32 characters"); // a short key would otherwise fail every request, forever
  const baseUrl = need(env, "BASE_URL");
  const identitySecret = need(env, "IDENTITY_SECRET");
  const retryText = env.BRAIN_RETRY_MS ?? "2000";
  if (!/^[1-9][0-9]*$/.test(retryText)) throw new Error("BRAIN_RETRY_MS must be a positive integer"); // NaN would make setTimeout spin every 1 ms
  return { databaseUrl, secret, baseUrl, identitySecret, retryMs: Number(retryText) };
}

/** The two constructors boot runs after the migration. Tests pass slowed-down wrappers around the real ones. */
export type BootDeps = { createIdentity: typeof createIdentity; createPostgresGraphStore: typeof createPostgresGraphStore };
export const realDeps: BootDeps = { createIdentity, createPostgresGraphStore };
