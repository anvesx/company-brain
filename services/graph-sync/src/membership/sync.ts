import { principal } from "../access.js";
import type { Ctx } from "../document.js";
import { SyncError } from "../types.js";

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
  // Every principal this run touched: a group emptied of members still appears through the ACLs that name it.
  for (const id of [...c.principals]) {
    const have = store.neighbors(tenant, id, { kind: "member-of", dir: "in" });
    for (const e of have) if (e.source === connector.id && !want.has(`${e.from}\0${e.to}`)) store.removeEdge(e, now());
  }
  for (const key of want) {
    const [from, to] = key.split("\0") as [string, string];
    if (store.neighbors(tenant, from, { kind: "member-of", dir: "out" }).some((e) => e.to === to)) continue;
    store.addEdge({ tenant, from, to, kind: "member-of", source: connector.id }, now());
    c.report.edges++;
  }
}
