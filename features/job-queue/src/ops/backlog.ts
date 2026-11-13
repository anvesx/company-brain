import { BackpressureError } from "../types.ts";

export type Sql = { executeSql(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }> };

/**
 * Returns how many more jobs the tenant may queue (`limit` minus the waiting ones) and throws when that is none. The count stops at `limit`, so the work
 * is bounded by `limit` index entries. Without `ensureBacklogIndex` the planner scans the whole job
 * table (pg-boss has no index on group_id for waiting jobs); with it the plan is an index-only scan.
 */
export async function guardBacklog(sql: Sql, schema: string, queue: string, tenant: string, limit: number): Promise<number> {
  const text = `SELECT count(*)::int AS n FROM (SELECT 1 FROM ${schema}.job WHERE name = $1 AND group_id = $2 AND state < 'active' LIMIT $3) w`;
  const { rows } = await sql.executeSql(text, [queue, tenant, limit]);
  const room = limit - Number(rows[0]!["n"]);
  if (room <= 0) throw new BackpressureError(tenant, limit);
  return room;
}

/** pg-boss ships no (name, group_id, state) index; the guard needs one. Idempotent, run once at boot. */
export async function ensureBacklogIndex(sql: Sql, schema: string): Promise<void> {
  await sql.executeSql(`CREATE INDEX IF NOT EXISTS job_backlog_guard ON ${schema}.job (name, group_id, state)`);
}
