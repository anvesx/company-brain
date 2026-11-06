import { randomBytes } from "node:crypto";
import { join } from "node:path";
import pg from "pg";
import { afterAll, afterEach } from "vitest";
import * as gs from "../../../src/index.js";
import { tmpDir } from "../helpers.js";
import { findPostgres, mustRun, startPostgres, type Throwaway } from "./server.js";

/** The promise-returning store both dialects implement. Read off the module so a missing export fails per test. */
export type AsyncStore = gs.AsyncGraphStore;

/** One empty backing database. `open` may be called again to get a second handle on the same data. */
export interface Backing {
  open(): Promise<AsyncStore>;
}
export interface Factory {
  name: "sqlite" | "postgres";
  /** Why this factory is skipped on this machine, or undefined when it runs. */
  skip: string | undefined;
  fresh(): Promise<Backing>;
}

const opened: { close(): Promise<void> }[] = [];
const pools: pg.Pool[] = [];
afterEach(async () => {
  for (const s of opened.splice(0)) await s.close().catch(() => undefined); // closed by the test already
  for (const p of pools.splice(0)) await p.end();
});

// One real server per test file, started on first use and stopped when the file ends.
let server: Promise<Throwaway> | undefined;
afterAll(async () => (await server)?.stop());
export const postgresServer = (): Promise<Throwaway> => (server ??= startPostgres());

const track = async (s: Promise<AsyncStore>): Promise<AsyncStore> => {
  const store = await s;
  opened.push(store);
  return store;
};

/** A pool whose every connection works inside one schema: each test gets an empty database of its own. */
export async function schemaPool(schema: string): Promise<pg.Pool> {
  const { url } = await postgresServer();
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  // Concurrent CREATE SCHEMA IF NOT EXISTS of one name races on pg_namespace; the advisory lock serialises it.
  await admin.query("SELECT pg_advisory_lock(hashtext($1))", [schema]);
  await admin.query(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await admin.query("SELECT pg_advisory_unlock(hashtext($1))", [schema]);
  await admin.end();
  const pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}`, max: 10 });
  pools.push(pool.on("error", () => undefined)); // the caller owns the pool, so a restart must not crash the test worker
  return pool;
}

const found = findPostgres();
const pgSkip = "reason" in found && !mustRun() ? found.reason : undefined;
if (pgSkip) console.warn(`graph-store: postgres variant skipped: ${pgSkip}`);

export const factories: Factory[] = [
  {
    name: "sqlite",
    skip: undefined,
    fresh: async () => {
      const path = join(tmpDir(), "g.db");
      return { open: () => track(Promise.resolve(gs.toAsync(gs.createGraphStore({ path })))) };
    },
  },
  {
    name: "postgres",
    skip: pgSkip,
    fresh: async () => {
      const pool = await schemaPool(`g_${randomBytes(6).toString("hex")}`);
      return { open: () => track(gs.createPostgresGraphStore({ pool })) };
    },
  },
];

/** A fresh store on a fresh backing database. */
export const openOn = async (f: Factory): Promise<AsyncStore> => (await f.fresh()).open();
