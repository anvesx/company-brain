import { viewer } from "../../access/visible.js";
import { ToolFailure } from "../../server/errors.js";
import { type Ctx, publicNode } from "../schema.js";

const MAX_NEIGHBOURS = 500;

/** One node and its edges whose other end the caller can also see. Hidden and missing look the same. */
export function nodeView(ctx: Ctx, id: string, asOf?: number) {
  const { store, caller } = ctx;
  const can = viewer(store, caller, asOf);
  const n = store.node(caller.tenant, id, asOf);
  if (n === undefined || !can.sees(id)) throw new ToolFailure("NOT_FOUND", `no node ${id}`);
  const neighbours = [];
  let truncated = false;
  for (const e of store.neighbors(caller.tenant, id, asOf === undefined ? {} : { asOf })) {
    if (!can.sees(e.from === id ? e.to : e.from)) continue;
    if (neighbours.length === MAX_NEIGHBOURS) {
      truncated = true;
      break;
    }
    neighbours.push({ from: e.from, to: e.to, kind: e.kind, source: e.source });
  }
  const { address, version, props } = n;
  return { node: { ...publicNode(n), address, version, props }, neighbours, ...(truncated ? { truncated } : {}) };
}
