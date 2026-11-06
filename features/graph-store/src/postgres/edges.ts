import type pg from "pg";
import { bad, EDGE_KINDS, type Edge, type EdgeKind, NOW, oneOf, text, time } from "../schema.js";

type Row = Record<string, unknown>;
const toEdge = (r: Row): Edge => ({
  tenant: r["tenant"] as string,
  from: r["from_id"] as string,
  to: r["to_id"] as string,
  kind: r["kind"] as EdgeKind,
  source: r["source"] as string,
});
const VALID = "valid_from <= $2 AND (valid_to IS NULL OR $2 < valid_to)";

function check(e: Edge): [string, string, string, string, string] {
  const kind = oneOf("kind", e?.kind, EDGE_KINDS);
  return [text("tenant", e.tenant), text("from", e.from), text("to", e.to), kind, text("source", e.source)];
}

export function edgeOps(pool: pg.Pool) {
  return {
    /** The partial unique index makes a repeated add a no-op, even when instances race. */
    async add(e: Edge, at: number): Promise<void> {
      const [t, from, to, kind, source] = check(e);
      const sql = `INSERT INTO edges (tenant, from_id, to_id, kind, source, valid_from) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant, from_id, to_id, kind) WHERE valid_to IS NULL DO NOTHING`;
      await pool.query(sql, [t, from, to, kind, source, time("at", at)]);
    },
    async remove(e: Edge, at: number): Promise<void> {
      const [t, from, to, kind] = check(e);
      const sql = "UPDATE edges SET valid_to = $1 WHERE tenant = $2 AND from_id = $3 AND to_id = $4 AND kind = $5 AND valid_to IS NULL";
      await pool.query(sql, [time("at", at), t, from, to, kind]);
    },
    async neighbors(tenant: string, id: string, o: { kind?: EdgeKind; dir?: "out" | "in"; asOf?: number } = {}): Promise<Edge[]> {
      const t = text("tenant", tenant),
        i = text("id", id);
      if (o.dir !== undefined && o.dir !== "out" && o.dir !== "in") bad('dir must be "out" or "in"');
      const when = o.asOf === undefined ? NOW : time("asOf", o.asOf);
      const side = o.dir === "out" ? "from_id = $3" : o.dir === "in" ? "to_id = $3" : "(from_id = $3 OR to_id = $3)";
      const args: unknown[] = [t, when, i];
      let sql = `SELECT * FROM edges WHERE tenant = $1 AND ${side} AND ${VALID}`;
      if (o.kind !== undefined) {
        sql += " AND kind = $4";
        args.push(oneOf("kind", o.kind, EDGE_KINDS));
      }
      return (await pool.query(`${sql} ORDER BY seq`, args)).rows.map(toEdge);
    },
    /** Every current edge of one kind that one source wrote. */
    async bySource(tenant: string, source: string, kind: EdgeKind): Promise<Edge[]> {
      const sql = `SELECT * FROM edges WHERE tenant = $1 AND ${VALID} AND source = $3 AND kind = $4 ORDER BY seq`;
      const args = [text("tenant", tenant), NOW, text("source", source), oneOf("kind", kind, EDGE_KINDS)];
      return (await pool.query(sql, args)).rows.map(toEdge);
    },
  };
}
