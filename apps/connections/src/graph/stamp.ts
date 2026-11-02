import type { Connector } from "@brain/connector-kit";
import type { GraphNode, GraphStore } from "@brain/graph-store";
import type { Account } from "../accounts/types.js";
import { coreZone, keepsSourceAcl } from "./zone.js";

/**
 * Every listed document carries the account's zone as a core-types zone (see `coreZone`).
 * A `private` or `personal` account is written owner-only: each document's readers become the owner alone and no memberships are listed,
 * so nothing from the source's ACL reaches the shared graph. A `company` account keeps the source's readers.
 */
export const withZone = (c: Connector, a: Pick<Account, "dataZone" | "owner">): Connector => {
  const zone = coreZone(a.dataZone);
  const open = keepsSourceAcl(a.dataZone);
  const out: Connector = {
    ...c,
    list: async (q) => {
      const page = await c.list(q);
      const items = page.items.map((d) => ({ ...d, zone, ...(!open && { acl: { allowUsers: [a.owner], allowGroups: [], version: d.acl.version } }) }));
      return { ...page, items };
    },
  };
  if (!open) delete out.listMemberships;
  return out;
};

const bare = (n: GraphNode | undefined): GraphNode | undefined => {
  if (n === undefined || n.kind !== "document") return n;
  const props = { ...n.props };
  delete props["owner"];
  return { ...n, props };
};

/**
 * The real graph store, with the account's owner added to each document node on write.
 * Reads hide the owner so graph-sync's "unchanged" check still sees equal nodes and a re-run writes nothing.
 */
export const withOwner = (g: GraphStore, owner: string): GraphStore => ({
  ...g,
  upsertNode: (n, at) => g.upsertNode(n.kind === "document" ? { ...n, props: { ...n.props, owner } } : n, at),
  node: (...a) => bare(g.node(...a)),
});
