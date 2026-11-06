import type pg from "pg";
import { toNode } from "../../nodes.js";
import type { TitleQuery } from "../../scan/search.js";
import type { GraphNode } from "../../schema.js";
import { bad, text } from "../../schema.js";
import { pgTitleFilter } from "./filter.js";

/** `searchTitles` for Postgres: same filter as SQLite, ordered by id in code-unit order (COLLATE "C") so `after` pages it. */
export function searchOps(pool: pg.Pool) {
  return async (tenant: string, q: TitleQuery): Promise<GraphNode[]> => {
    if (!Number.isInteger(q?.limit) || q.limit < 1 || q.limit > 1000) bad("limit must be a whole number from 1 to 1000");
    const f = pgTitleFilter(tenant, q);
    let sql = `SELECT n.* FROM nodes n WHERE ${f.where}`;
    if (q.after !== undefined) sql += ` AND n.id COLLATE "C" > $${f.args.push(text("after", q.after))}`;
    sql += ` ORDER BY n.id COLLATE "C" LIMIT $${f.args.push(q.limit)}`;
    return (await pool.query(sql, f.args)).rows.map(toNode);
  };
}
