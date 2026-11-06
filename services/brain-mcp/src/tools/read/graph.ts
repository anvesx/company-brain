import { inChunks } from "../../access/par.js";
import { viewer } from "../../access/visible.js";
import { type Ctx, publicNode } from "../schema.js";

type Viewer = Awaited<ReturnType<typeof viewer>>;

/** Every id the caller may see, sorted. Found by walking out from the caller, then kept only if `sees` agrees. */
async function visibleIds(ctx: Ctx, can: Viewer): Promise<string[]> {
  const { store, caller } = ctx;
  const t = caller.tenant;
  const found = new Set(can.principals);
  const reads = await inChunks([...can.principals], (p) => store.neighbors(t, p, { kind: "can-read", dir: "out" }));
  for (const read of reads.flat()) {
    found.add(read.to);
    const [belongs, readers] = await Promise.all([
      store.neighbors(t, read.to, { kind: "belongs-to", dir: "out" }),
      store.neighbors(t, read.to, { kind: "can-read", dir: "in" }),
    ]);
    for (const e of belongs) found.add(e.to);
    for (const e of readers) found.add(e.from);
  }
  const all = [...found];
  const seen = await inChunks(all, (id) => can.sees(id));
  return all.filter((_, i) => seen[i]).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** One page of the visible graph, in id order. `cursor` is the last id of the previous page. */
export async function graph(ctx: Ctx, args: { cursor?: string | undefined; limit: number }) {
  const { store, caller } = ctx;
  const can = await viewer(store, caller, undefined, true);
  const ids = (await visibleIds(ctx, can)).filter((id) => args.cursor === undefined || id > args.cursor);
  const page = ids.slice(0, args.limit);
  const nodes = (await store.nodesOf(caller.tenant, page)).map(publicNode);
  const out = await inChunks(page, async (id) => {
    const edges = await store.neighbors(caller.tenant, id, { dir: "out" });
    const seen = await Promise.all(edges.map((e) => can.sees(e.to)));
    return edges.filter((_, i) => seen[i]).map((e) => ({ from: e.from, to: e.to, kind: e.kind, source: e.source }));
  });
  const categories: Record<string, number> = {};
  for (const n of nodes) categories[n.group] = (categories[n.group] ?? 0) + 1;
  const last = page[page.length - 1];
  return { nodes, edges: out.flat(), categories, ...(ids.length > page.length && last !== undefined ? { next: last } : {}) };
}
