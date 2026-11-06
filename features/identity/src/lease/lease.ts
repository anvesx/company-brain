import type { AuthContext } from "better-auth";

type Adapter = AuthContext["adapter"];

/** Refresh a token when it ends within 30 minutes. A refresher holds a row for 2 minutes: one that dies lets go by itself after that. */
export const WINDOW_MS = 30 * 60_000;
export const LEASE_MS = 2 * 60_000;

/** The test every lease write repeats: active, expiring inside the window. A row with no expiry never matches `lt`. */
export const dueWhere = (now: number) => [
  { field: "status", value: "active" },
  { field: "accessTokenExpiresAt", operator: "lt" as const, value: new Date(now + WINDOW_MS) },
];

/** Only the "active" half of `dueWhere`: for a caller that refreshes whatever the expiry says. */
const activeWhere = [{ field: "status", value: "active" }];

const inIds = (ids: string[]) => ({ field: "id", operator: "in" as const, value: ids });

/**
 * Lease these rows to `lease`. One conditional write for the whole batch: it only touches rows that are still due
 * and active and whose lease has run out (or never was), so a row another refresher just took or refreshed is left alone.
 * Returns the ids this call now holds. The sweep service and the on-demand refresh in this package share this one function.
 * `anyExpiry` drops the "ends within the window" test, for `refreshAccount`, which refreshes whatever the expiry says.
 */
export async function takeLease(adapter: Adapter, ids: string[], lease: string, now: number, anyExpiry = false): Promise<string[]> {
  if (ids.length === 0) return [];
  const until = now + LEASE_MS;
  const base = [inIds(ids), ...(anyExpiry ? activeWhere : dueWhere(now))];
  const update = { refreshLease: lease, refreshLeaseUntil: until };
  // "Free" is a lease end in the past, or no lease end at all: a row written outside the adapter has NULL, and `lt` alone is false for NULL.
  // The two free tests are joined by OR; the adapter ANDs that pair with everything else in the list.
  const free = [
    { field: "refreshLeaseUntil", operator: "lt" as const, value: now, connector: "OR" as const },
    { field: "refreshLeaseUntil", value: null, connector: "OR" as const },
  ];
  await adapter.updateMany({ model: "account", where: [...base, ...free], update });
  // Read back what is ours: the write above is atomic, so a row carrying our name and our end time is held by us.
  const held = await adapter.findMany<{ id: string }>({
    model: "account",
    where: [inIds(ids), { field: "refreshLease", value: lease }, { field: "refreshLeaseUntil", value: until }],
    limit: ids.length,
    select: ["id"],
  });
  return held.map((row) => row.id);
}

/** Give the rows back. Only rows still held by `lease` change, so a late release never frees another refresher's rows. */
export async function releaseLease(adapter: Adapter, ids: string[], lease: string): Promise<void> {
  if (ids.length === 0) return;
  await adapter.updateMany({
    model: "account",
    where: [inIds(ids), { field: "refreshLease", value: lease }],
    update: { refreshLease: null, refreshLeaseUntil: 0 },
  });
}
