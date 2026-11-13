import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createPostgresGraphStore } from "@anvesx/graph-store";
import pg from "pg";
import { migrate } from "../../../src/index.js";
import type { startHttp } from "../http/server.js";
import { seedScale, seedViewers } from "./seed.js";

const freePort = (): Promise<number> =>
  new Promise((ok) => {
    const s = createServer().listen(0, "127.0.0.1", () => {
      const { port } = s.address() as { port: number }; // read before close: after close address() is null
      s.close(() => ok(port));
    });
  });

/**
 * Real Postgres 16 on SCALE_PG_PORT (a free port when unset) in a mktemp data dir. Order: graph-store tables, bulk seed, then the module's OWN
 * `migrate` (its real fv_* indexes), then ANALYZE. No index or SQL in this folder is a private copy.
 */
export async function scaleWorld() {
  const bin = process.env["PG_BIN"] ?? "/opt/homebrew/opt/postgresql@16/bin";
  const [dir, port] = [mkdtempSync(join(tmpdir(), "fv-scale-")), process.env["SCALE_PG_PORT"] ? Number(process.env["SCALE_PG_PORT"]) : await freePort()];
  const data = join(dir, "data");
  const env = { ...process.env, LC_ALL: "en_US.UTF-8" };
  const run = (cmd: string, args: string[]) => execFileSync(join(bin, cmd), args, { env, stdio: "pipe" });
  run("initdb", ["-D", data, "-U", "postgres", "--auth=trust", "-E", "UTF8"]);
  const opts = `-p ${port} -c listen_addresses=127.0.0.1 -c unix_socket_directories= -c max_connections=100 -c shared_buffers=256MB`;
  run("pg_ctl", ["-D", data, "-l", join(dir, "log"), "-w", "-o", opts, "start"]);
  const pool = new pg.Pool({ connectionString: `postgres://postgres@127.0.0.1:${port}/postgres`, max: 10 });
  pool.on("error", () => undefined);
  const stop = async () => {
    await pool.end().catch(() => undefined);
    run("pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]);
    rmSync(dir, { recursive: true, force: true });
  };
  try {
    await createPostgresGraphStore({ pool });
    const t = performance.now();
    await seedScale(pool);
    await seedViewers(pool);
    const seedMs = Math.round(performance.now() - t);
    await migrate(pool);
    await pool.query("VACUUM ANALYZE nodes"); // as autovacuum would: sets the visibility map so index-only scans are real
    await pool.query("VACUUM ANALYZE edges");
    const sql = `SELECT (SELECT count(*) FROM nodes WHERE kind='document' AND valid_to IS NULL) files,
      (SELECT count(*) FROM nodes WHERE kind='project') clusters, (SELECT count(*) FROM edges) edges`;
    return { pool, seedMs, counts: (await pool.query(sql)).rows[0] as Record<string, string>, stop };
  } catch (e) {
    await stop(); // a failed setup must not leave a server or a data dir behind; the error still fails the run
    throw e;
  }
}
export type World = Awaited<ReturnType<typeof scaleWorld>>;

/** What every suite reads: the one shared world (real Postgres) and the real HTTP server over it, both built once in world.test.ts. */
export type Ctx = { w: World; h: Awaited<ReturnType<typeof startHttp>> };
export const LONG = 180_000; // explicit per-test timeout: a slow query must fail on its p95 assertion, not on the 30 s default
