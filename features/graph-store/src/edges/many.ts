import type { DatabaseSync } from "node:sqlite";
import { toNode } from "../nodes.js";
import { bad, EDGE_KINDS, type Edge, type EdgeKind, type GraphNode, NOW, oneOf, text, time } from "../schema.js";

/** Most ids one nodesOf / edgesOf call accepts. Above it the call fails with BAD_INPUT: page the ids instead. */
export const MAX_IDS = 100_000;
/** Ids per IN list: one query per chunk, far below SQLite's bound-variable limit. */
const CHUNK = 5000;
const VALID = "valid_from <= ? AND (valid_to IS NULL OR ? < valid_to)";
const marks = (n: number): string => Array.from({ length: n }, () => "?").join(", ");
export const byId = (a: string, b: string): number => (a < b ? -1 : 1);

/** Checks the id list and returns it deduplicated and sorted, so chunking never changes the answer. */
export function cleanIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return bad("ids must be an array");
  if (ids.length > MAX_IDS) bad(`ids has ${ids.length} entries, the limit is ${MAX_IDS}`);
  return [...new Set(ids.map((id) => text("id", id)))].sort(byId);
}

type Row = Record<string, unknown>;
const toEdge = (r: Row): Edge => ({
  tenant: r["tenant"] as string,
  from: r["from_id"] as string,
  to: r["to_id"] as string,
  kind: r["kind"] as EdgeKind,
  source: r["source"] as string,
});

/** Runs `sql` once per CHUNK ids; `head` and `tail` are the bound values before and after the id list. */
function chunked(db: DatabaseSync, ids: string[], sql: (n: number) => string, head: string[], tail: (string | number)[]): Row[] {
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    const part = ids.slice(i, i + CHUNK);
    rows.push(...db.prepare(sql(part.length)).all(...head, ...part, ...tail));
  }
  return rows;
}

export function manyOps(db: DatabaseSync) {
  return {
    /** The nodes among `ids` valid at `asOf` (default now), sorted by id. Missing and duplicate ids are dropped. */
    nodesOf(tenant: string, ids: string[], asOf?: number): GraphNode[] {
      const t = text("tenant", tenant);
      const list = cleanIds(ids);
      const when = asOf === undefined ? NOW : time("asOf", asOf);
      const sql = (n: number) => `SELECT * FROM nodes WHERE tenant = ? AND id IN (${marks(n)}) AND ${VALID}`;
      return chunked(db, list, sql, [t], [when, when])
        .map(toNode)
        .sort((a, b) => byId(a.id, b.id));
    },
    /** Edges leaving ("out") or entering ("in") any id, optionally only of `kinds`, in insertion order. */
    edgesOf(tenant: string, ids: string[], o: { dir: "out" | "in"; kinds?: EdgeKind[]; asOf?: number }): Edge[] {
      const t = text("tenant", tenant);
      if (o?.dir !== "out" && o?.dir !== "in") bad('dir must be "out" or "in"');
      const kinds = o.kinds?.map((k) => oneOf("kind", k, EDGE_KINDS)) ?? [];
      const list = cleanIds(ids);
      const when = o.asOf === undefined ? NOW : time("asOf", o.asOf);
      if (o.kinds !== undefined && kinds.length === 0) return [];
      // "out" looks ids up as sources, "in" as targets; both columns sit in an index led by tenant.
      const col = o.dir === "out" ? "from_id" : "to_id";
      const kindSql = kinds.length === 0 ? "" : ` AND kind IN (${marks(kinds.length)})`;
      const sql = (n: number) => `SELECT rowid AS rid, * FROM edges WHERE tenant = ? AND ${col} IN (${marks(n)})${kindSql} AND ${VALID}`;
      const rows = chunked(db, list, sql, [t], [...kinds, when, when]);
      // One global insertion order, whatever the chunking.
      return rows.sort((a, b) => (a["rid"] as number) - (b["rid"] as number)).map(toEdge);
    },
  };
}
