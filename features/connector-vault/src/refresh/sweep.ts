import { inTenant } from "../store/tenant.js";
import type { Vault } from "../store/vault.js";
import type { Exchange } from "./exchange.js";
import { type Options, type Outcome, refreshOne } from "./refresh.js";

export type Due = { tenant: string; id: string; provider: string };

/** Active rows expiring within `windowMs` and not leased, oldest expiry first, keyset-paged (`after` is the last row of the previous page). */
export const dueRows = (vault: Vault, windowMs: number, limit: number, after?: { expiresAt: Date; id: string }): Promise<(Due & { expiresAt: Date })[]> =>
  inTenant(vault.pool, "sweeper", async (c) => {
    const { rows } = await c.query<{ tenant: string; id: string; provider: string; expires_at: Date }>(
      `SELECT tenant, id, provider, expires_at FROM connector_tokens
       WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at <= now() + $1 * interval '1 millisecond'
         AND (lease_until IS NULL OR lease_until < now()) AND (expires_at, id) > ($2::timestamptz, $3)
       ORDER BY expires_at, id LIMIT $4`,
      [windowMs, after?.expiresAt ?? new Date(0), after?.id ?? "", limit],
    );
    return rows.map((r) => ({ tenant: r.tenant, id: r.id, provider: r.provider, expiresAt: r.expires_at }));
  });

/** One pass over everything due. `exchangeFor` returns undefined for a provider this process cannot refresh. */
export async function sweep(
  vault: Vault,
  exchangeFor: (provider: string) => Exchange | undefined,
  windowMs = 600_000,
  o: Options = {},
  page = 200,
): Promise<Record<Outcome, number>> {
  const out: Record<Outcome, number> = { refreshed: 0, busy: 0, "needs-auth": 0, "retry-later": 0, missing: 0, unsupported: 0 };
  let after: { expiresAt: Date; id: string } | undefined;
  for (;;) {
    const rows = await dueRows(vault, windowMs, page, after);
    await Promise.all(
      rows.map(async (r) => {
        const ex = exchangeFor(r.provider);
        out[ex ? await refreshOne(vault, r.tenant, r.id, ex, o) : "unsupported"]++;
      }),
    );
    const last = rows.at(-1);
    if (last === undefined) return out;
    after = last;
  }
}
