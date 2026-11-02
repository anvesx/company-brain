import type { Acl } from "@anvesx/core-types";
import { SyncError } from "../types.js";
import { type Ctx, writeNode } from "./document.js";

export const principal = (c: Ctx, kind: "person" | "team", raw: string): string => {
  const { tenant, connector, resolve } = c.deps;
  const id = resolve === undefined ? raw : resolve(kind, raw);
  if (c.principals.has(id)) return id;
  const old = c.deps.store.node(tenant, id);
  if (old !== undefined && old.kind !== kind) throw new SyncError("BAD_INPUT", `${id} is already a ${old.kind}, not a ${kind}`);
  // Written once, by whichever source saw it first: a person shared by two connectors is not rewritten on every run.
  if (old === undefined) writeNode(c, { tenant, id, kind, source: connector.id, address: id, title: id, version: "", props: {} });
  c.principals.add(id);
  return id;
};

/** Makes the current `can-read` edges of `doc` equal the ACL: adds missing ones, closes stale ones. */
export const syncAccess = (c: Ctx, doc: string, acl: Acl): void => {
  const { store, tenant, connector, now } = c.deps;
  const want = new Set([...acl.allowUsers.map((u) => principal(c, "person", u)), ...acl.allowGroups.map((g) => principal(c, "team", g))]);
  const have = store.neighbors(tenant, doc, { kind: "can-read", dir: "in" });
  const has = new Set(have.map((e) => e.from));
  for (const e of have) {
    if (!want.has(e.from) && e.source === connector.id) store.removeEdge(e, now());
  }
  for (const from of want) {
    if (has.has(from)) continue;
    store.addEdge({ tenant, from, to: doc, kind: "can-read", source: connector.id }, now());
    c.report.edges++;
  }
};
