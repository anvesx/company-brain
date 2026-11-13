import type { AsyncGraphStore, GraphNode } from "@anvesx/graph-store";

const AT = 1_000;
const SOURCES = ["gdrive", "notion", "github", "slack"];

import { fid, members, pad } from "./data/layout.js";
import { OWNERS } from "./data/visible.js";

export { bulk } from "./data/bulk.js";
export { fid, members, pathOf } from "./data/layout.js";
export { ownerOf, visibleIdx } from "./data/visible.js";

export const doc = (tenant: string, id: string, i: number, over: Record<string, string> = {}): GraphNode => ({
  tenant,
  id,
  kind: "document",
  source: SOURCES[i % 4] as string,
  address: `https://src.example/${id}`,
  title: `Doc ${pad(i)}`,
  version: "v1",
  props: {
    owner: OWNERS[i % 3] as string,
    zone: i % 10 === 0 ? "team" : i % 10 === 5 ? "personal" : "company",
    ...(i % 10 === 0 ? { team: "eng" } : {}),
    mime: i % 2 ? "text/plain" : "application/pdf",
    size: String(((i * 37) % 1000) + 1),
    modified: new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(),
    folder: `/f/${i % 5}`,
    ...over,
  },
});
const cluster = (tenant: string, id: string, name: string, n: number, parent?: string): GraphNode => ({
  tenant,
  id,
  kind: "project",
  source: "brain",
  address: `brain://${id}`,
  title: name,
  version: "v1",
  props: { "cluster.type": ["place", "people", "topic"][n % 3] as string, "cluster.why": `Why ${id}`, ...(parent ? { "cluster.parent": parent } : {}) },
});

/** t1: 500 files, 40 clusters over 3 levels. t2 and t3: 100 files each, t2 reusing t1 ids, with a poisoned cluster why. */
export async function seedWorld(store: AsyncGraphStore): Promise<void> {
  const put = (n: GraphNode) => store.upsertNode(n, AT);
  const edge = (tenant: string, from: string, to: string, kind: "can-read" | "belongs-to" | "member-of") =>
    store.addEdge({ tenant, from, to, kind, source: "t" }, AT);
  for (const p of ["alice", "bob", "carol"])
    await put({ tenant: "t1", id: p, kind: "person", source: "slack", address: `p://${p}`, title: p, version: "1", props: {} });
  await put({ tenant: "t1", id: "eng", kind: "team", source: "slack", address: "t://eng", title: "eng", version: "1", props: {} });
  await edge("t1", "alice", "eng", "member-of");
  for (let r = 0; r < 4; r++) await put(cluster("t1", `r${r}`, `Root r${r}`, r));
  for (let m = 0; m < 12; m++) await put(cluster("t1", `m${m}`, `Mid m${m}`, m, `r${m % 4}`));
  for (let l = 0; l < 24; l++) await put(cluster("t1", `l${l}`, `Leaf l${l}`, l, `m${l % 12}`));
  for (let i = 0; i < 500; i++) {
    await put(doc("t1", fid(i), i));
    for (const l of members(i)) await edge("t1", fid(i), `l${l}`, "belongs-to");
    if (i % 2 === 0) await edge("t1", "alice", fid(i), "can-read");
    if (i % 5 === 0) await edge("t1", "eng", fid(i), "can-read");
    if (i % 3 === 0) await edge("t1", "bob", fid(i), "can-read");
    if (i % 7 === 0) await edge("t1", "carol", fid(i), "can-read");
  }
  for (const [t, p] of [
    ["t2", "g"],
    ["t3", "h"],
  ] as const) {
    await put({ ...cluster(t, "l0", `Leaf l0`, 0), props: { "cluster.type": "topic", "cluster.why": `OTHER TENANT WHY ${t}` } });
    for (let i = 0; i < 100; i++) {
      await put(doc(t, `${p}${pad(i)}`, i, { owner: "alice", zone: "company" }));
      await edge(t, "alice", `${p}${pad(i)}`, "can-read");
      await edge(t, `${p}${pad(i)}`, "l0", "belongs-to");
    }
  }
}
