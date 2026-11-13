import type pg from "pg";
import { VaultError } from "../errors.js";
import type { Keyring } from "../seal/keyring.js";
import { open, seal } from "../seal/seal.js";
import { type AuditEvent, inTenant } from "./tenant.js";

/** What is sealed: the access token and, when the provider issues one, the refresh token. */
export type Token = { accessToken: string; refreshToken?: string };
export type Meta = { id: string; tenant: string; owner: string; provider: string; status: "active" | "needs-auth"; expiresAt: Date | null };
export type Stored = Meta & { token: Token };
export type NewRow = { id: string; owner: string; provider: string; token: Token; expiresAt?: Date | null };

export type Vault = ReturnType<typeof createVault>;

const COLS = "id, tenant, owner, provider, status, expires_at, sealed";
type Row = { id: string; tenant: string; owner: string; provider: string; status: Meta["status"]; expires_at: Date | null; sealed: string };
const meta = (r: Row): Meta => ({ id: r.id, tenant: r.tenant, owner: r.owner, provider: r.provider, status: r.status, expiresAt: r.expires_at });

/** Row ids are bound into the sealed value as AAD, so only a safe, bounded charset is accepted. */
const ID = /^[A-Za-z0-9_:.-]{1,128}$/;

/** `audit` is called whenever a cross-tenant (sweeper) transaction starts. */
export function createVault(pool: pg.Pool, ring: Keyring, opts: { audit?: (e: AuditEvent) => void } = {}) {
  const audit = opts.audit;
  return {
    pool,
    ring,
    audit,
    /** Insert or replace one connection's token (status back to active, lease cleared). Another tenant's id is refused by the policy. */
    put: (tenant: string, r: NewRow): Promise<void> =>
      inTenant(pool, tenant, async (c) => {
        if (!ID.test(r.id)) throw new VaultError("BAD_ID", "id must be 1-128 characters of A-Z a-z 0-9 _ : . -");
        await c.query(
          `INSERT INTO connector_tokens (id, tenant, owner, provider, kid, sealed, expires_at) VALUES ($1,$2,$3,$4,$5,$6,$7)
           ON CONFLICT (id) DO UPDATE SET owner=$3, provider=$4, kid=$5, sealed=$6, expires_at=$7, status='active', lease_until=NULL, updated_at=now()`,
          [r.id, tenant, r.owner, r.provider, ring.current.kid, seal(ring, r.id, JSON.stringify(r.token)), r.expiresAt ?? null],
        );
      }),
    /** The one place a token is opened: per tenant, per id, on demand. There is no read-all. */
    get: (tenant: string, id: string): Promise<Stored | undefined> =>
      inTenant(pool, tenant, async (c) => {
        const { rows } = await c.query<Row>(`SELECT ${COLS} FROM connector_tokens WHERE id = $1`, [id]);
        const r = rows[0];
        return r && { ...meta(r), token: JSON.parse(open(ring, r.id, r.sealed)) as Token };
      }),
    /** Metadata only, never a token. */
    list: (tenant: string): Promise<Meta[]> =>
      inTenant(pool, tenant, async (c) => (await c.query<Row>(`SELECT ${COLS} FROM connector_tokens ORDER BY id`)).rows.map(meta)),
    /** Disconnect: the ciphertext row goes in the same transaction as `alsoInTx`, so both commit or neither does. */
    remove: (tenant: string, id: string, alsoInTx?: (c: pg.PoolClient) => Promise<void>): Promise<boolean> =>
      inTenant(pool, tenant, async (c) => {
        const { rowCount } = await c.query("DELETE FROM connector_tokens WHERE id = $1", [id]);
        await alsoInTx?.(c);
        return rowCount === 1;
      }),
    /** How many of these ids exist, across tenants (the migration count check). */
    countIds: (ids: string[]): Promise<number> =>
      inTenant(
        pool,
        "sweeper",
        async (c) => Number((await c.query<{ n: string }>("SELECT count(*) AS n FROM connector_tokens WHERE id = ANY($1)", [ids])).rows[0]?.n),
        audit,
      ),
  };
}
