import { DatabaseSync } from "node:sqlite";
import { bad, text } from "../schema.js";

const DDL = `
CREATE TABLE IF NOT EXISTS nodes (tenant TEXT NOT NULL, id TEXT NOT NULL, kind TEXT NOT NULL, source TEXT NOT NULL, address TEXT NOT NULL,
  title TEXT NOT NULL, version TEXT NOT NULL, props TEXT NOT NULL, valid_from REAL NOT NULL, valid_to REAL);
CREATE UNIQUE INDEX IF NOT EXISTS nodes_current ON nodes (tenant, id) WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS nodes_history ON nodes (tenant, id, valid_from);
CREATE TABLE IF NOT EXISTS edges (tenant TEXT NOT NULL, from_id TEXT NOT NULL, to_id TEXT NOT NULL, kind TEXT NOT NULL, source TEXT NOT NULL,
  valid_from REAL NOT NULL, valid_to REAL);
CREATE UNIQUE INDEX IF NOT EXISTS edges_current ON edges (tenant, from_id, to_id, kind) WHERE valid_to IS NULL;
CREATE INDEX IF NOT EXISTS edges_out ON edges (tenant, from_id, kind);
CREATE INDEX IF NOT EXISTS edges_in ON edges (tenant, to_id, kind);`;

/** Opens the SQLite file, switches it to WAL and creates the tables. */
export function openDb(path: string): DatabaseSync {
  text("path", path);
  const testing = process.env["NODE_ENV"] === "test" || process.env["VITEST"] !== undefined;
  if (path === ":memory:" && !testing) bad(":memory: is only allowed in tests");
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout = 10000");
  // Switching to WAL while another process does the same fails at once with SQLITE_BUSY: the busy
  // handler is not consulted. Retry that race a bounded number of times, then give up loudly.
  for (let attempt = 0; ; attempt++) {
    try {
      db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
      db.exec(DDL);
      return db;
    } catch (e) {
      if (attempt >= 200 || (e as { errcode?: number }).errcode !== 5) {
        db.close();
        throw e;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
    }
  }
}
