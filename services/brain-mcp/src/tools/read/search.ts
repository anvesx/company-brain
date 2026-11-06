import type { NodeKind } from "@anvesx/graph-store";
import { viewer } from "../../access/visible.js";
import { ToolFailure } from "../../server/errors.js";
import { type Ctx, publicNode } from "../schema.js";

/** Most candidate titles one call examines. Bounds the time of a call whatever the graph holds (see "Known limits"). */
export const MAX_CANDIDATES = 4096;
const ALL: NodeKind[] = ["document", "person", "team", "project", "repo", "channel", "ticket"];

/**
 * Titles that match and that the caller may see, at most `limit`, in the order they were stored.
 * The store lists candidates in order and stops once `limit` are found, so a common word costs one page, not the
 * whole match list. Documents are kept by one edge probe inside the store (the caller or their teams can read
 * them); every other kind is checked with `sees`. `next` continues the search; `truncated` says the candidate
 * cap was reached first, so the page is partial but `next` still reaches everything.
 */
export function search(ctx: Ctx, args: { query: string; kinds?: string[] | undefined; limit: number; cursor?: string | undefined }) {
  if (args.query.trim() === "") throw new ToolFailure("INVALID_ARGUMENT", "query must not be blank");
  const { store, caller } = ctx;
  const can = viewer(store, caller, undefined, true);
  const page = store.scanTitles(caller.tenant, {
    text: args.query,
    kinds: (args.kinds ?? ALL) as NodeKind[],
    limit: args.limit,
    cap: MAX_CANDIDATES,
    ...(args.cursor === undefined ? {} : { cursor: Number(args.cursor) }),
    reachedBy: { from: [...can.principals], kind: "can-read", only: "document" },
    accept: (n) => n.kind === "document" || can.sees(n.id, n.kind),
  });
  return {
    nodes: page.nodes.map(publicNode),
    ...(page.next === undefined ? {} : { next: String(page.next) }),
    ...(page.truncated ? { truncated: true } : {}),
  };
}
