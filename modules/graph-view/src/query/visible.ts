import type { Edge, EdgeKind, GraphNode, GraphStore, NodeKind } from "@anvesx/graph-store";

/** What the rule-1 walk finds: the visible nodes (sorted by id) and every edge leaving a visible node. */
export interface Visible {
  nodes: GraphNode[];
  edges: Edge[];
}

type Opts = { tenant: string; user: string; aliases?: string[] | undefined; asOf?: number | undefined };

/**
 * Rule 1, in bulk: each step is one nodesOf or edgesOf call over a whole set of ids, never one call per node.
 *   principals = the user, their aliases (other names sources know them by) and the teams any of those are members of
 *   documents  = what the principals can read
 *   extras     = projects and repos the documents belong to, and the other people and teams who can read them
 */
export function visibleSet(store: GraphStore, { tenant, user, aliases = [], asOf }: Opts): Visible {
  const when = asOf === undefined ? {} : { asOf };
  const nodes = (ids: string[], kinds: NodeKind[]) => store.nodesOf(tenant, ids, asOf).filter((n) => kinds.includes(n.kind));
  const out = (ids: string[], kinds?: EdgeKind[]) => store.edgesOf(tenant, ids, { dir: "out", ...(kinds ? { kinds } : {}), ...when });
  const ends = (edges: Edge[], end: "from" | "to") => edges.map((e) => e[end]);

  // Every member-of target is a principal, whether or not it has a node of its own: /v1/documents counts it the same way.
  // A tombstoned team grants nothing because the store closes all its edges, so no node check is needed here.
  const names = [...new Set([user, ...aliases])];
  const teamIds = ends(out(names, ["member-of"]), "to");
  const teams = nodes(teamIds, ["team"]); // only teams that exist are drawn
  const principals = [...names, ...teamIds];
  const docs = nodes(ends(out(principals, ["can-read"]), "to"), ["document"]);
  const docIds = docs.map((d) => d.id);

  const fromDocs = out(docIds); // every edge leaving a document, of any kind
  const places = nodes(
    ends(
      fromDocs.filter((e) => e.kind === "belongs-to"),
      "to",
    ),
    ["project", "repo"],
  );
  const toDocs = store.edgesOf(tenant, docIds, { dir: "in", kinds: ["can-read"], ...when }); // who can read them
  const readers = nodes(ends(toDocs, "from"), ["person", "team"]);

  // The user's own node counts only when it exists (a person with no node still has the documents they can read).
  const byId = new Map<string, GraphNode>();
  for (const n of [...store.nodesOf(tenant, [user], asOf), ...teams, ...docs, ...places, ...readers]) byId.set(n.id, n);
  const isDoc = new Set(docIds);
  const others = [...byId.keys()].filter((id) => !isDoc.has(id)); // documents' edges were read above
  const sorted = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  // The edges of everything visible, each read once. A document's reader edges came in as `toDocs`, so a can-read
  // row a person or team holds to a document is dropped here; one to a project or repo is kept (both ends visible).
  const rest = out(others, ["authored", "member-of", "mentions", "links-to", "belongs-to", "can-read"]).filter(
    (e) => e.kind !== "can-read" || !isDoc.has(e.to),
  );
  return { nodes: sorted, edges: [...fromDocs.filter((e) => e.kind !== "can-read"), ...toDocs, ...rest] };
}
