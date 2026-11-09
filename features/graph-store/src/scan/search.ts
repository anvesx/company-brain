import type { DatabaseSync } from "node:sqlite";
import { toNode } from "../nodes.js";
import { bad, text } from "../schema.js";
import { type TitleFilter, titleFilter } from "./filters.js";

export interface TitleQuery extends TitleFilter {
  limit: number;
  after?: string;
}

/** The SQL of one search: the trigram index narrows the rows, LIKE decides the match, ordered by id so `after` can page it. */
export function searchSql(tenant: string, q: TitleQuery) {
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 1000) bad("limit must be a whole number from 1 to 1000");
  const f = titleFilter(tenant, q);
  // The trigram index only knows words of 3 or more characters. CROSS JOIN pins the order (index first, then nodes).
  const indexed = [...f.needle].length >= 3;
  let sql = `SELECT n.* FROM ${indexed ? "node_titles f CROSS JOIN nodes n ON n.rowid = f.rowid" : "nodes n"} WHERE ${indexed ? "f.title MATCH ? AND " : ""}${f.where}`;
  const args: (string | number)[] = indexed ? [f.match, ...f.args] : f.args;
  if (q.after !== undefined) {
    sql += " AND n.id > ?";
    args.push(text("after", q.after));
  }
  return { sql: `${sql} ORDER BY n.id LIMIT ?`, args: [...args, q.limit] };
}

/** Substring search over node titles in one tenant, ordered by id so `after` can page it. */
export function searchOps(db: DatabaseSync) {
  return (tenant: string, q: TitleQuery) => {
    const { sql, args } = searchSql(tenant, q);
    return db
      .prepare(sql)
      .all(...args)
      .map(toNode);
  };
}
