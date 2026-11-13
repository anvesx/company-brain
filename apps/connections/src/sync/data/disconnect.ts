import type { Account } from "../../accounts/types.js";
import type { Deps } from "../../deps.js";
import { sourceOf } from "../connector.js";

/** Closes every current `can-read` and `member-of` edge this account wrote. Documents and history stay. */
export function closeAccountEdges(graph: NonNullable<Deps["sync"]>["graph"], a: Account, nowMs: number): number {
  let closed = 0;
  for (const kind of ["can-read", "member-of"] as const) {
    for (const e of graph.edgesBySource(a.tenant, sourceOf(a), kind)) {
      graph.removeEdge(e, nowMs);
      closed++;
    }
  }
  return closed;
}

/** Disconnect: close the account's edges first (so a failure leaves the account in place), then drop the sealed token and the row. */
export async function disconnect(d: Deps, a: Account): Promise<void> {
  if (d.sync) closeAccountEdges(d.sync.graph, a, d.now() * 1000);
  await d.vault.remove(a.tenant, a.id);
  d.store.remove(a.tenant, a.id);
}
