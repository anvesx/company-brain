import type { GraphNode, GraphStore } from "@anvesx/graph-store";
import type { Account } from "../accounts/types.js";
import { docId } from "./namespace.js";

/**
 * The real graph store as one account sees it. What lands in the graph, and what the reads hide so graph-sync's
 * "unchanged" check sees equal nodes and a re-run writes nothing:
 * - documents get the account's owner in `props` (reads hide it) and keep the source's own `address` while the id is namespaced (reads show the id);
 * - person nodes are shared between accounts, so reads show them as this account's: whichever account wrote one first keeps it.
 */
export const forAccount = (g: GraphStore, a: Pick<Account, "owner" | "provider" | "id">): GraphStore => {
  const source = `${a.provider}:${a.id}`;
  const prefix = docId(source, "");
  const real = (n: GraphNode): string => (n.address.startsWith(prefix) ? n.address.slice(prefix.length) : n.address);
  const seen = (n: GraphNode | undefined): GraphNode | undefined => {
    if (n === undefined) return n;
    if (n.kind === "person") return { ...n, source };
    if (n.kind !== "document") return n;
    const props = { ...n.props };
    delete props["owner"];
    return { ...n, address: n.id, props };
  };
  return {
    ...g,
    upsertNode: (n, at) => g.upsertNode(n.kind === "document" ? { ...n, address: real(n), props: { ...n.props, owner: a.owner } } : n, at),
    node: (...q) => seen(g.node(...q)),
  };
};
