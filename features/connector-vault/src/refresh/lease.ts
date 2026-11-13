import type pg from "pg";
import { inTenant } from "../store/tenant.js";

/** Take the row's lease for `ms` using the database clock. False when another replica holds it or the row is gone or in needs-auth. */
export const takeLease = (pool: pg.Pool, tenant: string, id: string, ms: number): Promise<boolean> =>
  inTenant(pool, tenant, async (c) => {
    const r = await c.query(
      "UPDATE connector_tokens SET lease_until = now() + $2 * interval '1 millisecond' WHERE id = $1 AND status = 'active' AND (lease_until IS NULL OR lease_until < now())",
      [id, ms],
    );
    return r.rowCount === 1;
  });

export const releaseLease = (pool: pg.Pool, tenant: string, id: string): Promise<void> =>
  inTenant(pool, tenant, async (c) => void (await c.query("UPDATE connector_tokens SET lease_until = NULL WHERE id = $1", [id])));

/** Only the provider's refusal lands here; the sealed credential is kept so a re-consent can replace it. */
export const markNeedsAuth = (pool: pg.Pool, tenant: string, id: string): Promise<void> =>
  inTenant(
    pool,
    tenant,
    async (c) => void (await c.query("UPDATE connector_tokens SET status = 'needs-auth', lease_until = NULL, updated_at = now() WHERE id = $1", [id])),
  );
