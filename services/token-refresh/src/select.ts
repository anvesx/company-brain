import { type AccountRow, type createIdentity, dueWhere, WINDOW_MS } from "@anvesx/identity";

/** better-auth's own adapter, exactly as `identity.adapter()` hands it out (so the token seal always applies). */
export type Adapter = Awaited<ReturnType<ReturnType<typeof createIdentity>["adapter"]>>;

// Both live in @anvesx/identity: the lease writes there repeat the same "due" test.
export { dueWhere, WINDOW_MS };

/**
 * Ids of connector accounts that are due, in ascending id order, at most `limit`, starting after `afterId`.
 * A leased row is still returned: the lease, not this query, decides which replica refreshes it.
 */
export async function selectDue(adapter: Adapter, now: number, limit: number, afterId?: string): Promise<string[]> {
  const where = [...dueWhere(now), ...(afterId === undefined ? [] : [{ field: "id", operator: "gt" as const, value: afterId }])];
  // Only the id is read, so no token column is opened just to pick rows.
  const rows = await adapter.findMany<{ id: string }>({ model: "account", where, sortBy: { field: "id", direction: "asc" }, limit, select: ["id"] });
  return rows.map((row) => row.id);
}

/** The full rows for these ids in one query, keyed by id, so the refresh does not read each row again. Token columns arrive opened. */
export async function readRows(adapter: Adapter, ids: string[]): Promise<Map<string, AccountRow>> {
  const rows = await adapter.findMany<AccountRow>({ model: "account", where: [{ field: "id", operator: "in", value: ids }], limit: ids.length });
  return new Map(rows.map((row) => [row.id, row]));
}
