import { DatabaseSync } from "node:sqlite";
import { bad, text } from "../schema.js";
import { TITLES_DDL } from "./titles.js";

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
      // A 64 MB page cache (the default is 2 MB) keeps the title index and the hot rows in memory across queries.
      db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA cache_size = -65536;");
      const indexed = db.prepare("SELECT 1 FROM sqlite_master WHERE name = 'node_titles'").get() !== undefined;
      db.exec(DDL + TITLES_DDL);
      // A file made before the index existed has titles the index has never seen: read them in once.
      if (!indexed) db.exec("INSERT INTO node_titles(node_titles) VALUES ('rebuild')");
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
