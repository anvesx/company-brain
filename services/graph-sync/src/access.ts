import type { Acl } from "@brain/core-types";
import { type Ctx, writeNode } from "./document.js";

export const principal = (c: Ctx, kind: "person" | "team", raw: string): string => {
  const { tenant, connector, resolve } = c.deps;
  const id = resolve === undefined ? raw : resolve(kind, raw);
  if (c.principals.has(id)) return id;
  c.principals.add(id);
  writeNode(c, { tenant, id, kind, source: connector.id, address: id, title: id, version: "", props: {} });
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
