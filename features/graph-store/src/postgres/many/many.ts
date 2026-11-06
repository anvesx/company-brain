import type pg from "pg";
import { byId, cleanIds } from "../../edges/many.js";
import { toNode } from "../../nodes.js";
import { bad, EDGE_KINDS, type Edge, type EdgeKind, type GraphNode, NOW, oneOf, text, time } from "../../schema.js";

type Row = Record<string, unknown>;
const toEdge = (r: Row): Edge => ({
  tenant: r["tenant"] as string,
  from: r["from_id"] as string,
  to: r["to_id"] as string,
  kind: r["kind"] as EdgeKind,
  source: r["source"] as string,
});
const VALID = "valid_from <= $3 AND (valid_to IS NULL OR $3 < valid_to)";

/** `nodesOf` and `edgesOf` for Postgres: one `= ANY(array)` query each, same rules and order as the SQLite version. */
export function manyOps(pool: pg.Pool) {
  return {
    async nodesOf(tenant: string, ids: string[], asOf?: number): Promise<GraphNode[]> {
      const t = text("tenant", tenant);
      const list = cleanIds(ids);
      const when = asOf === undefined ? NOW : time("asOf", asOf);
      const rows = (await pool.query(`SELECT * FROM nodes WHERE tenant = $1 AND id = ANY($2::text[]) AND ${VALID}`, [t, list, when])).rows;
      return rows.map(toNode).sort((a, b) => byId(a.id, b.id)); // sorted here: the database's collation is not code-unit order
    },
    async edgesOf(tenant: string, ids: string[], o: { dir: "out" | "in"; kinds?: EdgeKind[]; asOf?: number }): Promise<Edge[]> {
      const t = text("tenant", tenant);
      if (o?.dir !== "out" && o?.dir !== "in") bad('dir must be "out" or "in"');
      const kinds = o.kinds?.map((k) => oneOf("kind", k, EDGE_KINDS)) ?? [];
      const list = cleanIds(ids);
      const when = o.asOf === undefined ? NOW : time("asOf", o.asOf);
      if (o.kinds !== undefined && kinds.length === 0) return [];
      const col = o.dir === "out" ? "from_id" : "to_id";
      const args: unknown[] = [t, list, when];
      let sql = `SELECT * FROM edges WHERE tenant = $1 AND ${col} = ANY($2::text[]) AND ${VALID}`;
      if (kinds.length > 0) {
        sql += " AND kind = ANY($4::text[])";
        args.push(kinds);
      }
      return (await pool.query(`${sql} ORDER BY seq`, args)).rows.map(toEdge);
    },
  };
}
