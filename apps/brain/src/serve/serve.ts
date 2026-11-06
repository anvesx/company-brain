import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { getRequestListener } from "@hono/node-server";
import { PostgresDialect } from "kysely";
import pg from "pg";
import { createBrainApp } from "../app.js";
import { mount, type Parts } from "./mount.js";
import { type BootDeps, isTransient, listenOn, migrateLocked, readEnv, realDeps } from "./startup.js";

/** Start the production server: one Postgres pool shared by identity and the graph, listening on HOST:PORT. */
export async function serve(
  env: NodeJS.ProcessEnv,
  log: (m: string) => void = console.error,
  deps: BootDeps = realDeps, // the boot-wait test slows these down to catch close() mid-boot
): Promise<{ port: number; pool: pg.Pool; close(): Promise<void> }> {
  const { databaseUrl, cursorKey, recheck, baseUrl, identitySecret, retryMs } = readEnv(env);
  const pool = new pg.Pool({ connectionString: databaseUrl, connectionTimeoutMillis: 3000 });
  // The only 'error' listener on the pool (the graph store adds none). A dropped idle client is logged, not thrown.
  pool.on("error", (e) => log(`postgres pool error: ${e.message}`));
  const config = {
    baseUrl,
    secret: identitySecret,
    resource: `${baseUrl.replace(/\/$/, "")}/mcp`, // the MCP resource URL identity issues tokens for
    // better-auth needs `type` next to a kysely dialect; without it it guesses the wrong SQL flavour for its own migrations.
    database: { dialect: new PostgresDialect({ pool }), type: "postgres" as const },
  };

  let parts: Parts | undefined;
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  let booting: Promise<void> = Promise.resolve(); // the boot attempt in flight; close() waits for it before ending the pool
  // Build everything that needs the database. An unreachable database is retried on the same pool; any other error is permanent.
  const boot = async (): Promise<void> => {
    try {
      await migrateLocked(pool, config);
      if (stopped) return; // close() arrived during the migration: it has finished cleanly, build nothing more
      const identity = deps.createIdentity(config);
      // `$context` resolves after every plugin init, incl. the oauth seed: wait so close() never ends the pool under it (see README).
      await identity.auth.$context;
      const store = await deps.createPostgresGraphStore({ pool });
      const brain = createBrainApp({ store, identity, cursorKey, ...(recheck && { recheck }) });
      parts = { brain: brain.handler, identity: getRequestListener(identity.routes.fetch) };
    } catch (e) {
      if (stopped) return; // close() ended the pool under the migration; that error is ours, not a failure
      if (!isTransient(e)) throw e;
      log(`brain: database not ready (${(e as Error).message}), retrying`);
      if (!stopped) timer = setTimeout(start, retryMs);
    }
  };
  // Run one boot attempt and remember it, so close() can wait for it. A permanent failure ends the process.
  const start = (): void => {
    booting = boot();
    booting.catch(fatal);
  };
  const fatal = (e: Error): void => {
    log(`brain: ${e.message}`);
    process.exit(1);
  };

  const server = createServer(mount(pool, () => parts));
  const host = env.HOST ?? "0.0.0.0";
  const port = Number(env.PORT ?? 8080);
  // A failed start must not leave the pool open: end it, then rethrow the original error.
  await listenOn(server, host, port).catch((e) => pool.end().then(() => Promise.reject(e)));
  log(`brain listening on ${host}:${port}`);
  start();
  return {
    port: (server.address() as AddressInfo).port,
    pool,
    close: async () => {
      stopped = true;
      clearTimeout(timer);
      await booting.catch(() => undefined); // let in-flight boot queries finish; a boot failure was already handled by fatal()
      server.closeAllConnections();
      await new Promise<void>((ok) => server.close(() => ok()));
      await pool.end();
    },
  };
}
