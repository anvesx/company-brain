import type { GraphNode, GraphStore } from "@anvesx/graph-store";

/**
 * The asker, the other names a source may know them by (`aliases`: email, linked account ids) and every team
 * any of those belongs to. A person or team with no node simply has no edges.
 */
function principals(store: GraphStore, tenant: string, user: string, aliases: string[]): string[] {
  const names = [user, ...aliases];
  const teams = names.flatMap((n) => store.neighbors(tenant, n, { kind: "member-of", dir: "out" }).map((e) => e.to));
  return [...new Set([...names, ...teams])];
}

/** Documents the user can read: `can-read` edges from the user or one of their teams. Metadata only. */
export function readableDocuments(store: GraphStore, tenant: string, user: string, aliases: string[] = []): GraphNode[] {
  const seen = new Map<string, GraphNode>();
  for (const p of principals(store, tenant, user, aliases)) {
    for (const e of store.neighbors(tenant, p, { kind: "can-read", dir: "out" })) {
      const n = store.node(tenant, e.to);
      if (n && n.kind === "document") seen.set(n.id, n);
    }
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export function canRead(store: GraphStore, tenant: string, user: string, documentId: string, aliases: string[] = []): boolean {
  const who = new Set(principals(store, tenant, user, aliases));
  return store.neighbors(tenant, documentId, { kind: "can-read", dir: "in" }).some((e) => who.has(e.from));
}
