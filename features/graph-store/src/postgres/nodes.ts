import type pg from "pg";
import { toNode } from "../nodes.js";
import type { GraphNode } from "../schema.js";
import { bad, NODE_KINDS, NOW, oneOf, text, time } from "../schema.js";
import { checkField } from "../validation/fields.js";
import { checkProps } from "../validation/props.js";
import { type Db, tx } from "./schema.js";

// Entries sorted by key so equal props always serialise to the same string (same rule as SQLite).
const canon = (p: Record<string, string>): string => JSON.stringify(Object.entries(p).sort(([a], [b]) => (a < b ? -1 : 1)));
const LOCK = "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))";
const VALID = "valid_from <= $3 AND (valid_to IS NULL OR $3 < valid_to)";

/** Closes the current row of one id at `w`. Rejects BAD_INPUT when `w` is before it started. */
async function closeNode(db: Db, t: string, id: string, w: number): Promise<void> {
  const old = (await db.query("SELECT valid_from FROM nodes WHERE tenant = $1 AND id = $2 AND valid_to IS NULL", [t, id])).rows[0];
  if (old !== undefined && w < old.valid_from) bad("at is before the current row's validFrom");
  await db.query("UPDATE nodes SET valid_to = $1 WHERE tenant = $2 AND id = $3 AND valid_to IS NULL", [w, t, id]);
}

export function nodeOps(pool: pg.Pool) {
  return {
    async upsert(n: GraphNode, when: number): Promise<void> {
      const t = text("tenant", n?.tenant),
        id = text("id", n.id),
        w = time("at", when);
      oneOf("kind", n.kind, NODE_KINDS);
      const props = canon(checkProps(n.props));
      const f = (["source", "address", "title", "version"] as const).map((k) => checkField(k, n[k]));
      await tx(pool, async (c) => {
        // Two instances writing the same id take turns here, so history stays one contiguous chain.
        await c.query(LOCK, [t, id]);
        const old = (await c.query("SELECT * FROM nodes WHERE tenant = $1 AND id = $2 AND valid_to IS NULL", [t, id])).rows[0];
        if (old !== undefined) {
          const same = old.kind === n.kind && old.props === props && [old.source, old.address, old.title, old.version].every((v, i) => v === f[i]);
          if (same) return;
          await closeNode(c, t, id, w);
        }
        await c.query("INSERT INTO nodes (tenant, id, kind, source, address, title, version, props, valid_from) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)", [
          t,
          id,
          n.kind,
          ...f,
          props,
          w,
        ]);
      });
    },
    async get(tenant: string, id: string, asOf?: number): Promise<GraphNode | undefined> {
      const when = asOf === undefined ? NOW : time("asOf", asOf);
      const q = `SELECT * FROM nodes WHERE tenant = $1 AND id = $2 AND ${VALID}`;
      const r = await pool.query(q, [text("tenant", tenant), text("id", id), when]);
      return r.rows[0] === undefined ? undefined : toNode(r.rows[0]);
    },
    async history(tenant: string, id: string): Promise<GraphNode[]> {
      const r = await pool.query("SELECT * FROM nodes WHERE tenant = $1 AND id = $2 ORDER BY valid_from, seq", [text("tenant", tenant), text("id", id)]);
      return r.rows.map(toNode);
    },
    /** Tombstone in one transaction: close the node, then every current edge touching it. */
    async tombstone(tenant: string, id: string, at: number): Promise<void> {
      const [t, i, w] = [text("tenant", tenant), text("id", id), time("at", at)];
      await tx(pool, async (c) => {
        await c.query(LOCK, [t, i]);
        await closeNode(c, t, i, w);
        await c.query("UPDATE edges SET valid_to = $1 WHERE tenant = $2 AND (from_id = $3 OR to_id = $3) AND valid_to IS NULL", [w, t, i]);
      });
    },
  };
}
