import type pg from "pg";
import { toNode } from "../../nodes.js";
import type { TitleQuery } from "../../scan/search.js";
import type { GraphNode } from "../../schema.js";
import { bad, text } from "../../schema.js";
import { pgTitleFilter } from "./filter.js";

/** The search statement and its values. Exported so a test can EXPLAIN the exact SQL the store runs. */
export function searchSql(tenant: string, q: TitleQuery): { sql: string; args: unknown[] } {
  if (!Number.isInteger(q?.limit) || q.limit < 1 || q.limit > 1000) bad("limit must be a whole number from 1 to 1000");
  const f = pgTitleFilter(tenant, q);
  let sql = `SELECT n.* FROM nodes n WHERE ${f.where}`;
  if (q.after !== undefined) sql += ` AND n.id COLLATE "C" > $${f.args.push(text("after", q.after))}`;
  sql += ` ORDER BY n.id COLLATE "C" LIMIT $${f.args.push(q.limit)}`;
  return { sql, args: f.args };
}

/** `searchTitles` for Postgres: same filter as SQLite, ordered by id in code-unit order (COLLATE "C") so `after` pages it. */
export function searchOps(pool: pg.Pool) {
  return async (tenant: string, q: TitleQuery): Promise<GraphNode[]> => {
    const { sql, args } = searchSql(tenant, q);
    return (await pool.query(sql, args)).rows.map(toNode);
  };
}
