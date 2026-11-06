import type pg from "pg";
import { GraphError } from "../schema.js";

/** Anything with `query`: a whole pool (one statement) or one checked-out client (inside a transaction). */
export type Db = { query(sql: string, args?: unknown[]): Promise<pg.QueryResult> };

// Same tables as SQLite. `seq` gives insertion order (SQLite's rowid); times are double precision so
// fractional, negative and Number.MAX_VALUE instants survive; props is the sorted-JSON text SQLite stores.
const DDL = `
CREATE TABLE IF NOT EXISTS nodes (seq bigint GENERATED ALWAYS AS IDENTITY, tenant text NOT NULL, id text NOT NULL, kind text NOT NULL,
  source text NOT NULL, address text NOT NULL, title text NOT NULL, version text NOT NULL, props text NOT NULL,
  valid_from double precision NOT NULL, valid_to double precision);
CREATE UNIQUE INDEX IF NOT EXISTS nodes_current ON nodes (tenant, id) WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS nodes_history ON nodes (tenant, id, valid_from);
CREATE TABLE IF NOT EXISTS edges (seq bigint GENERATED ALWAYS AS IDENTITY, tenant text NOT NULL, from_id text NOT NULL, to_id text NOT NULL,
  kind text NOT NULL, source text NOT NULL, valid_from double precision NOT NULL, valid_to double precision);
CREATE UNIQUE INDEX IF NOT EXISTS edges_current ON edges (tenant, from_id, to_id, kind) WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS edges_out ON edges (tenant, from_id, kind);
CREATE INDEX IF NOT EXISTS edges_in ON edges (tenant, to_id, kind);`;

/** Runs fn in one transaction on one connection. A failed run rolls back; a broken connection is thrown away. */
export async function tx<T>(pool: pg.Pool, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  // A connection killed mid-transaction also emits 'error' on the client; the failed query already rejects, so just swallow the event.
  const quiet = () => undefined;
  c.on("error", quiet);
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    c.off("error", quiet);
    c.release();
    return out;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => undefined); // the connection may already be dead
    // A GraphError is a caller mistake: the connection is fine. Anything else may have left it broken.
    c.off("error", quiet);
    c.release(e instanceof GraphError ? undefined : (e as Error));
    throw e;
  }
}

/** Creates the tables if missing. The lock makes parallel starts take turns: a bare CREATE TABLE IF NOT EXISTS race raises 23505. */
export const migrate = (pool: pg.Pool): Promise<void> =>
  tx(pool, async (c) => {
    await c.query("SELECT pg_advisory_xact_lock(7410001)");
    await c.query(DDL);
  });
