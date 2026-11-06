import { viewer } from "../../access/visible.js";
import { type Ctx, publicNode } from "../schema.js";

/** Every id the caller may see, sorted. Found by walking out from the caller, then kept only if `sees` agrees. */
function visibleIds(ctx: Ctx, can: ReturnType<typeof viewer>): string[] {
  const { store, caller } = ctx;
  const t = caller.tenant;
  const found = new Set(can.principals);
  for (const p of can.principals) {
    for (const read of store.neighbors(t, p, { kind: "can-read", dir: "out" })) {
      found.add(read.to);
      for (const e of store.neighbors(t, read.to, { kind: "belongs-to", dir: "out" })) found.add(e.to);
      for (const e of store.neighbors(t, read.to, { kind: "can-read", dir: "in" })) found.add(e.from);
    }
  }
  return [...found].filter((id) => can.sees(id)).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}

/** One page of the visible graph, in id order. `cursor` is the last id of the previous page. */
export function graph(ctx: Ctx, args: { cursor?: string | undefined; limit: number }) {
  const { store, caller } = ctx;
  const can = viewer(store, caller, undefined, true);
  const ids = visibleIds(ctx, can).filter((id) => args.cursor === undefined || id > args.cursor);
  const page = ids.slice(0, args.limit);
  const nodes = page.flatMap((id) => store.node(caller.tenant, id) ?? []).map(publicNode);
  const edges = page.flatMap((id) =>
    store
      .neighbors(caller.tenant, id, { dir: "out" })
      .filter((e) => can.sees(e.to))
      .map((e) => ({ from: e.from, to: e.to, kind: e.kind, source: e.source })),
  );
  const categories: Record<string, number> = {};
  for (const n of nodes) categories[n.group] = (categories[n.group] ?? 0) + 1;
  const last = page[page.length - 1];
  return { nodes, edges, categories, ...(ids.length > page.length && last !== undefined ? { next: last } : {}) };
}
