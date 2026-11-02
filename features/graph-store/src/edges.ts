import type { DatabaseSync } from "node:sqlite";
import { bad, EDGE_KINDS, type Edge, type EdgeKind, NOW, oneOf, text, time } from "./schema.js";

type Row = Record<string, unknown>;
const toEdge = (r: Row): Edge => ({
  tenant: r["tenant"] as string,
  from: r["from_id"] as string,
  to: r["to_id"] as string,
  kind: r["kind"] as EdgeKind,
  source: r["source"] as string,
});
const VALID = "valid_from <= ? AND (valid_to IS NULL OR ? < valid_to)";

function check(e: Edge): [string, string, string, string, string] {
  const kind = oneOf("kind", e?.kind, EDGE_KINDS);
  return [text("tenant", e.tenant), text("from", e.from), text("to", e.to), kind, text("source", e.source)];
}

export function edgeOps(db: DatabaseSync) {
  // The partial unique index on current rows makes a repeated add a no-op, even across processes.
  const ins = db.prepare("INSERT OR IGNORE INTO edges VALUES (?, ?, ?, ?, ?, ?, NULL)");
  const close = db.prepare("UPDATE edges SET valid_to = ? WHERE tenant = ? AND from_id = ? AND to_id = ? AND kind = ? AND valid_to IS NULL");
  const closeAll = db.prepare("UPDATE edges SET valid_to = ? WHERE tenant = ? AND (from_id = ? OR to_id = ?) AND valid_to IS NULL");
  return {
    add(e: Edge, at: number): void {
      const [t, from, to, kind, source] = check(e);
      ins.run(t, from, to, kind, source, time("at", at));
    },
    remove(e: Edge, at: number): void {
      const [t, from, to, kind] = check(e);
      close.run(time("at", at), t, from, to, kind);
    },
    closeAll(tenant: string, id: string, at: number): void {
      closeAll.run(time("at", at), text("tenant", tenant), text("id", id), id);
    },
    neighbors(tenant: string, id: string, o: { kind?: EdgeKind; dir?: "out" | "in"; asOf?: number } = {}): Edge[] {
      const t = text("tenant", tenant),
        i = text("id", id);
      if (o.dir !== undefined && o.dir !== "out" && o.dir !== "in") bad('dir must be "out" or "in"');
      const when = o.asOf === undefined ? NOW : time("asOf", o.asOf);
      const side = o.dir === "out" ? "from_id = ?" : o.dir === "in" ? "to_id = ?" : "(from_id = ? OR to_id = ?)";
      const args: (string | number)[] = [t, i, ...(o.dir === undefined ? [i] : [])];
      let sql = `SELECT * FROM edges WHERE tenant = ? AND ${side} AND ${VALID}`;
      args.push(when, when);
      if (o.kind !== undefined) {
        sql += " AND kind = ?";
        args.push(oneOf("kind", o.kind, EDGE_KINDS));
      }
      return db
        .prepare(`${sql} ORDER BY rowid`)
        .all(...args)
        .map(toEdge);
    },
    /** Every current edge of one kind that one source wrote. */
    bySource(tenant: string, source: string, kind: EdgeKind): Edge[] {
      const q = `SELECT * FROM edges WHERE tenant = ? AND source = ? AND kind = ? AND ${VALID} ORDER BY rowid`;
      return db
        .prepare(q)
        .all(text("tenant", tenant), text("source", source), oneOf("kind", kind, EDGE_KINDS), NOW, NOW)
        .map(toEdge);
    },
    /** Prepared out-edge lookup for traversal; ids come back in insertion order. */
    outTargets(kinds: readonly string[]): (tenant: string, id: string, when: number) => string[] {
      const marks = kinds.map(() => "?").join(", ");
      const q = db.prepare(`SELECT to_id FROM edges WHERE tenant = ? AND from_id = ? AND kind IN (${marks}) AND ${VALID} ORDER BY rowid`);
      return (t, id, when) => q.all(t, id, ...kinds, when, when).map((r) => r["to_id"] as string);
    },
  };
}
