import type { AsyncGraphStore, GraphNode } from "@anvesx/graph-store";

/**
 * The asker, the other names a source may know them by (`aliases`: email, linked account ids) and every team
 * any of those belongs to. A person or team with no node simply has no edges.
 */
async function principals(store: AsyncGraphStore, tenant: string, user: string, aliases: string[]): Promise<string[]> {
  const names = [user, ...aliases];
  const edges = await Promise.all(names.map((n) => store.neighbors(tenant, n, { kind: "member-of", dir: "out" })));
  return [...new Set([...names, ...edges.flat().map((e) => e.to)])];
}

/** Documents the user can read: `can-read` edges from the user or one of their teams. Metadata only. */
export async function readableDocuments(store: AsyncGraphStore, tenant: string, user: string, aliases: string[] = []): Promise<GraphNode[]> {
  const seen = new Map<string, GraphNode>();
  for (const p of await principals(store, tenant, user, aliases)) {
    for (const e of await store.neighbors(tenant, p, { kind: "can-read", dir: "out" })) {
      const n = await store.node(tenant, e.to);
      if (n && n.kind === "document") seen.set(n.id, n);
    }
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function canRead(store: AsyncGraphStore, tenant: string, user: string, documentId: string, aliases: string[] = []): Promise<boolean> {
  const who = new Set(await principals(store, tenant, user, aliases));
  return (await store.neighbors(tenant, documentId, { kind: "can-read", dir: "in" })).some((e) => who.has(e.from));
}
