import type { GraphNode, NodeKind } from "@anvesx/graph-store";
import { viewer } from "../../access/visible.js";
import { ToolFailure } from "../../server/errors.js";
import { type Ctx, publicNode } from "../schema.js";

/** Most candidate titles one call examines, over all its scans. Bounds the time of a call whatever the graph holds. */
export const MAX_CANDIDATES = 4096;
/** Rows asked for by each scan after the first, so hidden people, teams, projects and repos cost few scans. */
const TOP_UP = 1000;
const ALL: NodeKind[] = ["document", "person", "team", "project", "repo", "channel", "ticket"];
// Channels and tickets are never visible, so the store skips them. The rest need an edge walk, which is async: done here.
const NEEDS_CHECK = new Set<string>(["person", "team", "project", "repo"]);

/**
 * Titles that match and that the caller may see, at most `limit`, in the order they were stored.
 * The store lists candidates in order and stops once enough rows are found, so a common word costs one page, not
 * the whole match list. Documents are kept by one edge probe inside the store (the caller or their teams can read
 * them); people, teams, projects and repos are checked here, in one batch per scan. When those checks leave the page
 * short, the search scans on (TOP_UP rows at a time) until the page is full, the matches run out, or MAX_CANDIDATES
 * candidates have been examined in total. `next` continues the search; `truncated` says the budget ran out first,
 * so the page is partial but `next` still reaches everything.
 */
export async function search(ctx: Ctx, args: { query: string; kinds?: string[] | undefined; limit: number; cursor?: string | undefined }) {
  if (args.query.trim() === "") throw new ToolFailure("INVALID_ARGUMENT", "query must not be blank");
  const { store, caller } = ctx;
  const can = await viewer(store, caller, undefined, true);
  const found: GraphNode[] = [];
  let next = args.cursor === undefined ? undefined : Number(args.cursor);
  let budget = MAX_CANDIDATES;
  let first = true;
  while (found.length < args.limit && budget > 0) {
    const page = await store.scanTitles(caller.tenant, {
      text: args.query,
      kinds: (args.kinds ?? ALL) as NodeKind[],
      limit: first ? args.limit - found.length : TOP_UP,
      cap: budget,
      ...(next === undefined ? {} : { cursor: next }),
      reachedBy: { from: [...can.principals], kind: "can-read", only: "document" },
      accept: (n) => n.kind === "document" || NEEDS_CHECK.has(n.kind),
    });
    first = false;
    budget -= page.examined;
    // The store already checked documents; the other kinds are checked here, all of this scan's rows in one batch.
    const others = await can.seesMany(page.nodes.filter((n) => n.kind !== "document").map((n) => ({ id: n.id, kind: n.kind })));
    const seen = page.nodes.map((n) => n.kind === "document" || others.shift() === true);
    next = page.next;
    for (const [i, n] of page.nodes.entries()) {
      if (!seen[i]) continue;
      found.push(n);
      if (found.length < args.limit) continue;
      // The page is full before this scan's rows ran out: continue right after this row, not after the scan.
      if (i < page.nodes.length - 1) next = page.cursors[i];
      break;
    }
    if (next === undefined) break;
  }
  // Short page with more to scan: only the budget can have stopped the loop.
  const truncated = found.length < args.limit && next !== undefined;
  return {
    nodes: found.map(publicNode),
    ...(next === undefined ? {} : { next: String(next) }),
    ...(truncated ? { truncated: true } : {}),
  };
}
