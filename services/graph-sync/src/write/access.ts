import type { Acl } from "@anvesx/core-types";
import { SyncError } from "../types.js";
import { type Ctx, writeNode } from "./document.js";

export const principal = (c: Ctx, kind: "person" | "team", raw: string): string => {
  const { tenant, connector, resolve } = c.deps;
  const id = resolve === undefined ? raw : resolve(kind, raw);
  const old = c.principals.get(id) ?? c.deps.store.node(tenant, id)?.kind;
  if (old !== undefined && old !== kind) throw new SyncError("BAD_INPUT", `${id} is already a ${old}, not a ${kind}`);
  // Stryker disable next-line ConditionalExpression: equivalent, a principal seen this run already has its node, so the write below is skipped
  if (c.principals.has(id)) return id;
  // Written once, by whichever source saw it first: a person shared by two connectors is not rewritten on every run.
  if (c.deps.store.node(tenant, id) === undefined) writeNode(c, { tenant, id, kind, source: connector.id, address: id, title: id, version: "", props: {} });
  c.principals.set(id, kind);
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
