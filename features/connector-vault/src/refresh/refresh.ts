import { AuthError } from "../errors.js";
import type { Vault } from "../store/vault.js";
import type { Exchange } from "./exchange.js";
import { markNeedsAuth, releaseLease, takeLease } from "./lease.js";

export type Outcome = "refreshed" | "busy" | "needs-auth" | "retry-later" | "missing" | "unsupported";
export type Options = { attempts?: number; backoffMs?: number; leaseMs?: number; sleep?: (ms: number) => Promise<void> };

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Refresh one connection. The lease means one replica spends a rotating refresh token; the token is read again after the lease is held.
 * Crash tradeoff: the lease is a database-clock timestamp, not a held lock. A process that dies after taking it leaves the row
 * unrefreshable until `leaseMs` (default 60s) passes, then any replica retries. There is no watchdog; the delay is bounded and the
 * token is never spent twice, which we prefer to a faster recovery that could spend a rotating refresh token twice.
 * A provider refusal (AuthError) marks needs-auth. Any other failure is retried with doubling waits, then left active for the next sweep.
 */
export async function refreshOne(vault: Vault, tenant: string, id: string, exchange: Exchange, o: Options = {}): Promise<Outcome> {
  const { attempts = 3, backoffMs = 200, leaseMs = 60_000, sleep = wait } = o;
  if (!(await takeLease(vault.pool, tenant, id, leaseMs))) {
    const row = await vault.get(tenant, id);
    return row === undefined ? "missing" : row.status === "needs-auth" ? "needs-auth" : "busy";
  }
  try {
    const row = await vault.get(tenant, id);
    const refreshToken = row?.token.refreshToken;
    if (row === undefined || refreshToken === undefined) return row === undefined ? "missing" : "unsupported";
    for (let n = 1; ; n++) {
      try {
        const f = await exchange(refreshToken);
        const expiresAt = f.expiresInSec === undefined ? null : new Date(Date.now() + f.expiresInSec * 1000);
        await vault.put(tenant, {
          id,
          owner: row.owner,
          provider: row.provider,
          token: { accessToken: f.accessToken, refreshToken: f.refreshToken ?? refreshToken },
          expiresAt,
        });
        return "refreshed";
      } catch (error) {
        if (error instanceof AuthError) {
          await markNeedsAuth(vault.pool, tenant, id);
          return "needs-auth";
        }
        if (n >= attempts) return "retry-later";
        await sleep(backoffMs * 2 ** (n - 1));
      }
    }
  } finally {
    await releaseLease(vault.pool, tenant, id);
  }
}
