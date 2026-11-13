import type pg from "pg";

/**
 * One transaction scoped to a tenant. `app.tenant` is transaction-local, so a pooled connection never carries
 * one tenant's scope into the next request. `sweeper` is the one cross-tenant mode (due scan, rotation, count).
 */
export async function inTenant<T>(pool: pg.Pool, scope: string | "sweeper", fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query("SELECT set_config('app.tenant', $1, true), set_config('app.sweeper', $2, true)", [
      scope === "sweeper" ? "" : scope,
      scope === "sweeper" ? "on" : "off",
    ]);
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (error) {
    await c.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    c.release();
  }
}
