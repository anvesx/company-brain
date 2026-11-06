import type { AsyncGraphStore, GraphNode } from "@anvesx/graph-store";

/** The asker plus every team they belong to. A person or team with no node simply has no edges. */
async function principals(store: AsyncGraphStore, tenant: string, user: string): Promise<string[]> {
  const teams = (await store.neighbors(tenant, user, { kind: "member-of", dir: "out" })).map((e) => e.to);
  return [user, ...teams];
}

/** Documents the user can read: `can-read` edges from the user or one of their teams. Metadata only. */
export async function readableDocuments(store: AsyncGraphStore, tenant: string, user: string): Promise<GraphNode[]> {
  const seen = new Map<string, GraphNode>();
  for (const p of await principals(store, tenant, user)) {
    for (const e of await store.neighbors(tenant, p, { kind: "can-read", dir: "out" })) {
      const n = await store.node(tenant, e.to);
      if (n && n.kind === "document") seen.set(n.id, n);
    }
  }
  return [...seen.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function canRead(store: AsyncGraphStore, tenant: string, user: string, documentId: string): Promise<boolean> {
  const who = new Set(await principals(store, tenant, user));
  return (await store.neighbors(tenant, documentId, { kind: "can-read", dir: "in" })).some((e) => who.has(e.from));
}
