import type { Account } from "../accounts/types.js";
import type { Deps } from "../deps.js";
import { rewriteTokens } from "../tokens/rewrite.js";
import { sourceOf } from "./connector.js";

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

/** Disconnect: close the account's edges first (so a failure leaves the account in place), then drop the credential and refresh the token file. */
export function disconnect(d: Deps, a: Account): void {
  if (d.sync) closeAccountEdges(d.sync.graph, a, d.now() * 1000);
  d.store.remove(a.id);
  rewriteTokens(d);
}
