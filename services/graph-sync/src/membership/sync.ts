import { SyncError } from "../types.js";
import { principal } from "../write/access.js";
import type { Ctx } from "../write/document.js";

/** Makes the connector's `member-of` edges equal its membership list: adds missing ones, closes the ones it no longer reports. */
export async function syncMemberships(c: Ctx): Promise<void> {
  const { store, tenant, connector, now } = c.deps;
  if (connector.listMemberships === undefined) return;
  const pairs = await connector.listMemberships().catch((e: unknown) => {
    throw new SyncError("CONNECTOR_FAILED", `connector ${connector.id} failed listing memberships: ${String(e)}`, e);
  });
  const want = new Set<string>();
  for (const { group, user } of pairs) {
    const edge = { from: principal(c, "person", user), to: principal(c, "team", group) };
    want.add(`${edge.from}\0${edge.to}`);
  }
  // Everything this connector wrote, so a team that left both the ACLs and the list is closed too.
  for (const e of store.edgesBySource(tenant, connector.id, "member-of")) {
    if (!want.has(`${e.from}\0${e.to}`)) store.removeEdge(e, now());
  }
  for (const key of want) {
    const [from, to] = key.split("\0") as [string, string];
    if (store.neighbors(tenant, from, { kind: "member-of", dir: "out" }).some((e) => e.to === to)) continue;
    store.addEdge({ tenant, from, to, kind: "member-of", source: connector.id }, now());
    c.report.edges++;
  }
}
