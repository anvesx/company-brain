import type { GraphNode } from "@brain/graph-store";
import type { Caller } from "../auth.js";

/** Asks the source whether `caller` can still read `doc` right now. Throwing or returning false hides the document. */
export type Recheck = (doc: GraphNode, caller: Caller) => Promise<boolean>;

/** Keeps the documents that pass the live check. Fails closed: a rejected check hides that document. */
export async function stillReadable(docs: GraphNode[], caller: Caller, check?: Recheck): Promise<GraphNode[]> {
  if (check === undefined) return docs;
  const ok = await Promise.all(docs.map((d) => check(d, caller).catch(() => false)));
  return docs.filter((_, i) => ok[i]);
}
