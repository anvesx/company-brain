import type { GraphStore } from "@anvesx/graph-store";

/** Gives `user` one readable document "d-1" and leaves "d-2" in the same tenant that nobody gave them. */
export function seedDocs(store: GraphStore, tenant: string, user: string) {
  const n = (id: string, kind: "person" | "document") => ({
    tenant,
    id,
    kind,
    source: "drive",
    address: `https://drive.example.com/${id}`,
    title: `title of ${id}`,
    version: "1",
    props: kind === "document" ? { zone: "company" } : {},
  });
  for (const x of [n(user, "person"), n("d-1", "document"), n("d-2", "document")]) store.upsertNode(x, 1);
  store.addEdge({ tenant, from: user, to: "d-1", kind: "can-read", source: "drive" }, 1);
}

/**
 * The folder connector files every document under zone "personal" with no owner, which the gate hides. An admin promotion
 * (zone-policy) is what makes such a document company-wide; this does the same write for the named ids, on the real store.
 */
export function promote(store: GraphStore, tenant: string, ids: string[]) {
  for (const id of ids) {
    const old = store.node(tenant, id);
    if (old) store.upsertNode({ ...old, props: { ...old.props, zone: "company" } }, Date.now() + 60_000);
  }
}
