import type { AsyncGraphStore, Edge, EdgeKind, GraphNode, GraphStore, NodeKind } from "@anvesx/graph-store";
import { openGate, type Recheck, type RecheckLimits } from "@anvesx/visibility/gate";

/** The view reads through either store: the local SQLite one or the Postgres one the production server runs on. */
export type ViewStore = GraphStore | AsyncGraphStore;

/** What the rule-1 walk finds: the visible nodes (sorted by id) and every edge leaving a visible node. */
export interface Visible {
  nodes: GraphNode[];
  edges: Edge[];
}

type Opts = {
  tenant: string;
  user: string;
  aliases?: string[] | undefined;
  asOf?: number | undefined;
  recheck?: Recheck | undefined;
  recheckLimits?: RecheckLimits | undefined;
};

/**
 * Rule 1, in bulk: each step is one nodesOf or edgesOf call over a whole set of ids, never one call per node.
 *   principals = the user, their aliases (other names sources know them by) and the teams any of those are members of
 *   documents  = what the shared permission gate approves now (time travel changes what is drawn, never who may read)
 *   extras     = projects and repos the documents belong to, and the readers of documents the viewer owns or administers
 */
export async function visibleSet(store: ViewStore, { tenant, user, aliases = [], asOf, recheck, recheckLimits }: Opts): Promise<Visible> {
  const when = asOf === undefined ? {} : { asOf };
  const nodes = async (ids: string[], kinds: NodeKind[]) => (await store.nodesOf(tenant, ids, asOf)).filter((n) => kinds.includes(n.kind));
  const out = (ids: string[], kinds?: EdgeKind[]) => store.edgesOf(tenant, ids, { dir: "out", ...(kinds ? { kinds } : {}), ...when });
  const ends = (edges: Edge[], end: "from" | "to") => edges.map((e) => e[end]);

  // Permissions are always the current ones (leak 5): an old asOf only picks which version of a node is drawn.
  const gate = openGate(store, { tenant, user, aliases }, { recheck, ...(recheckLimits && { limits: recheckLimits }) });
  const names = [...new Set([user, ...aliases])];
  const teamIds = (await gate.principals()).filter((p) => !names.includes(p));
  const teams = await nodes(teamIds, ["team"]); // only teams that exist are drawn
  const approved = await gate.approve();
  const docs = await nodes([...approved.keys()], ["document"]);
  const docIds = docs.map((d) => d.id);
  const seesReaders = new Set(docIds.filter((id) => approved.get(id)?.readers !== undefined)); // leak 4: owner or admin only

  const fromDocs = await out(docIds); // every edge leaving a document, of any kind
  const places = await nodes(
    ends(
      fromDocs.filter((e) => e.kind === "belongs-to"),
      "to",
    ),
    ["project", "repo"],
  );
  const toDocs = await store.edgesOf(tenant, [...seesReaders], { dir: "in", kinds: ["can-read"], ...when }); // who can read them
  const readers = await nodes(ends(toDocs, "from"), ["person", "team"]);

  // The user's own node counts only when it exists (a person with no node still has the documents they can read).
  const byId = new Map<string, GraphNode>();
  for (const n of [...(await store.nodesOf(tenant, [user], asOf)), ...teams, ...docs, ...places, ...readers]) byId.set(n.id, n);
  const isDoc = new Set(docIds);
  const others = [...byId.keys()].filter((id) => !isDoc.has(id)); // documents' edges were read above
  const sorted = [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
  // The edges of everything visible, each read once. A document's reader edges came in as `toDocs`, so a can-read
  // row a person or team holds to a document is kept only when it is the viewer's own or a team of theirs; one to a project or repo is kept (both ends visible).
  const mine = new Set([...names, ...teamIds]); // the viewer's own grants are theirs to see; other readers are leak 4
  const rest = (await out(others, ["authored", "member-of", "mentions", "links-to", "belongs-to", "can-read"])).filter(
    (e) => e.kind !== "can-read" || !isDoc.has(e.to) || mine.has(e.from),
  );
  return { nodes: sorted, edges: [...fromDocs.filter((e) => e.kind !== "can-read"), ...toDocs, ...rest] };
}
