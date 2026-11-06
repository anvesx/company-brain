import type { Edge, EdgeKind, GraphStore, NodeKind } from "@anvesx/graph-store";
import { categoriesOf, groupOf } from "./groups.js";
import { checkAsOf, checkKey, decodeCursor, encodeCursor, pageSize } from "./limits.js";
import { visibleSet } from "./visible.js";

/** Other names the sources know a user by (email, linked account ids): ACLs may name them instead of the user's id. */
export type Aliases = (user: string) => Promise<string[]>;

export interface GraphViewQuery {
  tenant: string;
  user: string;
  aliases?: string[] | undefined;
  asOf?: number | undefined;
  limit?: number | undefined;
  cursor?: string | undefined;
  /** 32 secret bytes that sign cursors; share one key across instances so any of them accepts any cursor. */
  cursorKey: Uint8Array;
}
export interface GraphViewPage {
  nodes: { id: string; kind: NodeKind; source: string; title: string; group: string }[];
  edges: { from: string; to: string; kind: EdgeKind }[];
  categories: { group: string; count: number }[];
  next?: string;
}

/**
 * The graph the caller may see, one page at a time (spec rules 1 to 3, 7 and 8). Tenant and user are the
 * caller's own, so a view can never reach another tenant. Throws GraphError BAD_INPUT on a bad limit or cursor.
 */
export function visibleGraph(store: GraphStore, q: GraphViewQuery): GraphViewPage {
  const size = pageSize(q.limit);
  checkAsOf(q.asOf);
  checkKey(q.cursorKey);
  const after = decodeCursor(q.cursor, `${q.tenant}\n${q.user}`, q.cursorKey);
  const { nodes, edges } = visibleSet(store, q);

  // Nodes are sorted by id, so a page is a slice and the cursor is the id of its last node.
  const start = after === undefined ? 0 : nodes.findIndex((n) => n.id > after);
  const first = start < 0 ? nodes.length : start;
  const slice = nodes.slice(first, first + size);

  // An edge goes out once: on the page holding the later of its two ends, when both ends are visible.
  const wholeView = first === 0 && size >= nodes.length; // one page: an edge only needs both ends visible
  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const onPage = (e: Edge): boolean => {
    const [a, b] = [index.get(e.from), index.get(e.to)];
    if (a === undefined || b === undefined) return false;
    if (wholeView) return true;
    const later = Math.max(a, b);
    return later >= first && later < first + size;
  };
  const last = slice[slice.length - 1];
  return {
    // Only these five keys leave the server: no address, version or props (rule 7).
    nodes: slice.map((n) => ({ id: n.id, kind: n.kind, source: n.source, title: n.title, group: groupOf(n) })),
    edges: edges.filter(onPage).map((e) => ({ from: e.from, to: e.to, kind: e.kind })),
    categories: categoriesOf(nodes),
    ...(first + size < nodes.length && last ? { next: encodeCursor(last.id, `${q.tenant}\n${q.user}`, q.cursorKey) } : {}),
  };
}
