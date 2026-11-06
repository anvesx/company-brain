import { randomUUID } from "node:crypto";
import type { AuthContext } from "better-auth";
import { IdentityError, RefreshError } from "../errors.js";
import { releaseLease, takeLease, WINDOW_MS } from "./lease.js";
import type { createStore, Row } from "./store.js";

/**
 * One job per account at a time in this process: a second caller for the same account joins the job already running
 * and gets its result, so the provider is asked once. Shared by `port.accessToken` and `refreshAccount`.
 */
export const createSingleflight = () => {
  const inflight = new Map<string, Promise<string>>();
  return (id: string, job: () => Promise<string>): Promise<string> => {
    const running = inflight.get(id);
    if (running) return running;
    const started = job().finally(() => inflight.delete(id));
    inflight.set(id, started);
    return started;
  };
};

/**
 * Run `work` only if this call wins the lease on the row, and always give the lease back. Returns undefined when the lease is not ours.
 * `anyExpiry` leases a row that is not due yet (for `refreshAccount`). A row with a NULL lease end counts as free.
 */
export const underLease = async (
  adapter: () => Promise<AuthContext["adapter"]>,
  now: () => number,
  guard: ReturnType<typeof createStore>["guard"],
  id: string,
  anyExpiry: boolean,
  work: () => Promise<string>,
): Promise<string | undefined> => {
  const name = `refresh-${randomUUID()}`;
  const db = await adapter();
  const held = await guard(() => takeLease(db, [id], name, now(), anyExpiry));
  if (held.length === 0) return undefined;
  try {
    return await work();
  } finally {
    // If this write fails the lease simply runs out by itself in 2 minutes.
    await guard(() => releaseLease(db, [id], name)).catch(() => undefined);
  }
};

/**
 * `port.accessToken`: the current token for the caller's own account, refreshed first when it ends within the window.
 * Two calls for one account in this process share a single refresh; another process is kept out by a lease on the row.
 */
export const createOnDemand = (
  adapter: () => Promise<AuthContext["adapter"]>,
  now: () => number,
  { find, guard }: ReturnType<typeof createStore>,
  refresh: (row: Row) => Promise<string>,
  once: ReturnType<typeof createSingleflight>,
) => {
  const stillDue = (row: Row) => row.accessTokenExpiresAt != null && new Date(row.accessTokenExpiresAt).getTime() - now() <= WINDOW_MS;

  const leased = async (row: Row): Promise<string> => {
    const token = await underLease(adapter, now, guard, row.id, false, () => refresh(row));
    if (token !== undefined) return token;
    // Not ours: someone refreshed it just now, someone holds it, or it is not active. Look at the row as it is now.
    const current = await find(row.id);
    if (current?.status === "needs-auth") throw new RefreshError("NEEDS_AUTH", "sign in to this connector again");
    if (current?.accessToken && !stillDue(current)) return current.accessToken;
    // The provider is only ever asked while we hold the lease, so with no lease the answer is "try again".
    throw new RefreshError("LEASED", "another process is refreshing this account");
  };

  return async (user: string, providerId: string, accountId: string): Promise<string> => {
    const row = await find(accountId);
    if (!row || row.userId !== user || row.providerId !== providerId) throw new IdentityError("BAD_INPUT", "no such account", "accountId");
    // A row marked needs-auth stays so until the person links again: its stored state answers, the provider is not asked.
    if (!row.accessToken || row.status === "needs-auth") throw new RefreshError("NEEDS_AUTH", "sign in to this connector again");
    if (!stillDue(row)) return row.accessToken;
    return once(row.id, () => leased(row));
  };
};
