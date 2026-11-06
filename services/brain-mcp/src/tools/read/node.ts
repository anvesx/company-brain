import { viewer } from "../../access/visible.js";
import { ToolFailure } from "../../server/errors.js";
import { type Ctx, publicNode } from "../schema.js";

const MAX_NEIGHBOURS = 500;

/** One node and its edges whose other end the caller can also see. Hidden and missing look the same. */
export async function nodeView(ctx: Ctx, id: string, asOf?: number) {
  const { store, caller } = ctx;
  const can = await viewer(store, caller, asOf);
  const n = await store.node(caller.tenant, id, asOf);
  if (n === undefined || !(await can.sees(id))) throw new ToolFailure("NOT_FOUND", `no node ${id}`);
  const neighbours = [];
  let truncated = false;
  const edges = await store.neighbors(caller.tenant, id, asOf === undefined ? {} : { asOf });
  // The other end of every edge, checked in one batch rather than one store round trip per edge.
  const seen = await can.seesMany(edges.map((e) => ({ id: e.from === id ? e.to : e.from })));
  for (const [i, e] of edges.entries()) {
    if (!seen[i]) continue;
    if (neighbours.length === MAX_NEIGHBOURS) {
      truncated = true;
      break;
    }
    neighbours.push({ from: e.from, to: e.to, kind: e.kind, source: e.source });
  }
  const { address, version, props } = n;
  return { node: { ...publicNode(n), address, version, props }, neighbours, ...(truncated ? { truncated } : {}) };
}
