import type { GraphNode, NodeKind } from "@anvesx/graph-store";
import { viewer } from "../../access/visible.js";
import { ToolFailure } from "../../server/errors.js";
import { type Ctx, publicNode } from "../schema.js";

/** Most candidate titles one scan examines. Bounds the time of a call whatever the graph holds (see "Known limits"). */
export const MAX_CANDIDATES = 4096;
/** Most scans one call runs while hidden people, teams, projects and repos keep its page short. */
const MAX_ROUNDS = 4;
const ALL: NodeKind[] = ["document", "person", "team", "project", "repo", "channel", "ticket"];
// Channels and tickets are never visible, so the store skips them. The rest need an edge walk, which is async: done here.
const NEEDS_CHECK = new Set<string>(["person", "team", "project", "repo"]);

/**
 * Titles that match and that the caller may see, at most `limit`, in the order they were stored.
 * The store lists candidates in order and stops once `limit` are found, so a common word costs one page, not the
 * whole match list. Documents are kept by one edge probe inside the store (the caller or their teams can read
 * them); people, teams, projects and repos are checked here with `sees`, and a page they leave short is topped up
 * by scanning on, up to MAX_ROUNDS scans. `next` continues the search; `truncated` says a candidate cap or the
 * round limit was reached first, so the page is partial but `next` still reaches everything.
 */
export async function search(ctx: Ctx, args: { query: string; kinds?: string[] | undefined; limit: number; cursor?: string | undefined }) {
  if (args.query.trim() === "") throw new ToolFailure("INVALID_ARGUMENT", "query must not be blank");
  const { store, caller } = ctx;
  const can = await viewer(store, caller, undefined, true);
  const found: GraphNode[] = [];
  let cursor = args.cursor === undefined ? undefined : Number(args.cursor);
  let next: number | undefined;
  let truncated = false;
  for (let round = 1; found.length < args.limit; round++) {
    const page = await store.scanTitles(caller.tenant, {
      text: args.query,
      kinds: (args.kinds ?? ALL) as NodeKind[],
      limit: args.limit - found.length,
      cap: MAX_CANDIDATES,
      ...(cursor === undefined ? {} : { cursor }),
      reachedBy: { from: [...can.principals], kind: "can-read", only: "document" },
      accept: (n) => n.kind === "document" || NEEDS_CHECK.has(n.kind),
    });
    const seen = await Promise.all(page.nodes.map((n) => n.kind === "document" || can.sees(n.id, n.kind)));
    found.push(...page.nodes.filter((_, i) => seen[i]));
    next = page.next;
    truncated = page.truncated || (next !== undefined && found.length < args.limit && round === MAX_ROUNDS);
    if (next === undefined || page.truncated || round === MAX_ROUNDS) break;
    cursor = next;
  }
  return {
    nodes: found.map(publicNode),
    ...(next === undefined ? {} : { next: String(next) }),
    ...(truncated ? { truncated: true } : {}),
  };
}
