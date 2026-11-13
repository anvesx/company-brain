import { BackpressureError } from "../types.ts";

export type Sql = { executeSql(text: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }> };

/**
 * Throws when the tenant already has `limit` jobs waiting. The count stops at `limit`, so one check
 * reads at most `limit` matching rows, but it still walks the queue's index past other tenants' rows.
 */
export async function guardBacklog(sql: Sql, schema: string, queue: string, tenant: string, limit: number): Promise<void> {
  const text = `SELECT count(*)::int AS n FROM (SELECT 1 FROM ${schema}.job WHERE name = $1 AND group_id = $2 AND state < 'active' LIMIT $3) w`;
  const { rows } = await sql.executeSql(text, [queue, tenant, limit]);
  if (Number(rows[0]!["n"]) >= limit) throw new BackpressureError(tenant, limit);
}
