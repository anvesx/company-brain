import type { GraphNode, GraphStore } from "@anvesx/graph-store";

/** The asker plus every team they belong to. A person or team with no node simply has no edges. */
function principals(store: GraphStore, tenant: string, user: string): string[] {
  const teams = store.neighbors(tenant, user, { kind: "member-of", dir: "out" }).map((e) => e.to);
  return [user, ...teams];
}

/** Documents the user can read: `can-read` edges from the user or one of their teams. Metadata only. */
export function readableDocuments(store: GraphStore, tenant: string, user: string): GraphNode[] {
  const seen = new Map<string, GraphNode>();
  for (const p of principals(store, tenant, user)) {
    for (const e of store.neighbors(tenant, p, { kind: "can-read", dir: "out" })) {
      const n = store.node(tenant, e.to);
      if (n && n.kind === "document") seen.set(n.id, n);
    }
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function canRead(store: GraphStore, tenant: string, user: string, documentId: string): boolean {
  const who = new Set(principals(store, tenant, user));
  return store.neighbors(tenant, documentId, { kind: "can-read", dir: "in" }).some((e) => who.has(e.from));
}
