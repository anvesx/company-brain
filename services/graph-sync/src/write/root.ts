import { SyncError } from "../types.js";
import { type Ctx, writeNode } from "./document.js";

/**
 * Writes the connector's own `connector:<id>` project node. An id already held by another kind or source (a team another
 * connector listed first) is never overwritten: the run fails closed with BAD_INPUT before it writes anything.
 */
export const writeRoot = (c: Ctx): void => {
  const { store, connector, tenant } = c.deps;
  const old = store.node(tenant, c.root);
  if (old !== undefined && old.kind !== "project") throw new SyncError("BAD_INPUT", `${c.root} is already a ${old.kind}, not a project`);
  if (old !== undefined && old.source !== connector.id) throw new SyncError("BAD_INPUT", `${c.root} belongs to source ${old.source}`);
  writeNode(c, { tenant, id: c.root, kind: "project", source: connector.id, address: c.root, title: connector.id, version: "", props: {} });
};
