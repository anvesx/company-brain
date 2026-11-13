import type pg from "pg";
import { VaultError } from "../errors.js";

const ident = (name: string): string => `"${name.replaceAll('"', '""')}"`;

/**
 * Creates the table, its indexes and the row-level security policy. Safe to run twice.
 * `appRole` is refused (UNSAFE_ROLE) when it is a superuser or has BYPASSRLS, since either skips the policy.
 * FORCE makes the policy bind the table owner too; a superuser still bypasses it, so the app must connect as a plain role (`appRole` gets the grants).
 */
export async function migrate(pool: pg.Pool, appRole?: string): Promise<void> {
  if (appRole !== undefined) {
    const { rows } = await pool.query<{ rolsuper: boolean; rolbypassrls: boolean }>("SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1", [
      appRole,
    ]);
    if (rows[0]?.rolsuper || rows[0]?.rolbypassrls) throw new VaultError("UNSAFE_ROLE", "appRole must not be a superuser or bypass row-level security");
  }
  await pool.query(`
    CREATE TABLE IF NOT EXISTS connector_tokens (
      id text PRIMARY KEY, tenant text NOT NULL, owner text NOT NULL, provider text NOT NULL,
      kid text NOT NULL, sealed text NOT NULL, status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','needs-auth')),
      lease_until timestamptz, expires_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now());
    CREATE INDEX IF NOT EXISTS connector_tokens_due ON connector_tokens (expires_at, id) WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS connector_tokens_tenant ON connector_tokens (tenant, owner, provider);
    ALTER TABLE connector_tokens ENABLE ROW LEVEL SECURITY;
    ALTER TABLE connector_tokens FORCE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS tenant_rows ON connector_tokens;
    CREATE POLICY tenant_rows ON connector_tokens
      USING (tenant = current_setting('app.tenant', true) OR current_setting('app.sweeper', true) = 'on')
      WITH CHECK (tenant = current_setting('app.tenant', true) OR current_setting('app.sweeper', true) = 'on');`);
  if (appRole !== undefined) await pool.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON connector_tokens TO ${ident(appRole)}`);
}
