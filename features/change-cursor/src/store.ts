import { DatabaseSync, type StatementSync } from "node:sqlite";
import { DEFAULT_TTL_MS, requireCursor, requireFunction, requirePositiveInt, requireText, requireTime, SCHEMA_SQL } from "./schema.js";

/** Durable cursor and dedupe state, backed by one SQLite file. */
export interface CursorStore {
  getCursor(tenantId: string, source: string): string | undefined;
  setCursor(tenantId: string, source: string, cursor: string): void;
  /** Atomically records the id. Returns true if it was already seen inside the ttl. */
  seen(eventId: string): boolean;
}

/** Opens (or creates) the store. `clock` returns milliseconds. `ttlMs` defaults to 24 hours. */
export function createCursorStore(dbPath: string, clock: () => number, ttlMs: number = DEFAULT_TTL_MS): CursorStore {
  const path = requireText("dbPath", dbPath);
  const now = requireFunction("clock", clock);
  const ttl = requirePositiveInt("ttlMs", ttlMs);
  const db = new DatabaseSync(path);
  db.exec("PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;");
  db.exec(SCHEMA_SQL);
  const stmts = prepare(db);
  return {
    getCursor(tenantId, source) {
      const row = stmts.get.get(requireText("tenantId", tenantId), requireText("source", source));
      return row === undefined ? undefined : (row.cursor as string);
    },
    setCursor(tenantId, source, cursor) {
      stmts.set.run(requireText("tenantId", tenantId), requireText("source", source), requireCursor(cursor));
    },
    seen(eventId) {
      const id = requireText("eventId", eventId);
      const at = requireTime(now());
      // One statement: insert, or refresh only if the old record has expired. No change means seen.
      return stmts.seen.run(id, at, at - ttl).changes === 0;
    },
  };
}

function prepare(db: DatabaseSync): Record<"get" | "set" | "seen", StatementSync> {
  return {
    get: db.prepare("SELECT cursor FROM cursors WHERE tenant_id = ? AND source = ?"),
    set: db.prepare(
      "INSERT INTO cursors (tenant_id, source, cursor) VALUES (?, ?, ?) " + "ON CONFLICT(tenant_id, source) DO UPDATE SET cursor = excluded.cursor",
    ),
    seen: db.prepare(
      "INSERT INTO seen_events (event_id, seen_at) VALUES (?, ?) " +
        "ON CONFLICT(event_id) DO UPDATE SET seen_at = excluded.seen_at WHERE seen_events.seen_at <= ?",
    ),
  };
}
