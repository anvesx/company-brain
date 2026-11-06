import type { GraphStore } from "@anvesx/graph-store";

/**
 * Visibility rule 1 as a point check. A caller sees: themselves and their teams; documents any of them
 * can read; the projects and repos those documents belong to; people and teams that can read a visible
 * document. Never channels or tickets. Answers are remembered for the life of one viewer.
 * `bulk` is for checking many nodes (search, graph): the readable documents are listed once, not asked about one by one.
 */
export function viewer(store: GraphStore, who: { tenant: string; user: string }, asOf?: number, bulk = false) {
  const { tenant, user } = who;
  const at = asOf === undefined ? {} : { asOf };
  const principals = new Set([user]);
  for (const e of store.neighbors(tenant, user, { kind: "member-of", dir: "out", ...at })) principals.add(e.to);

  const memo = new Map<string, boolean>();
  let listed: Set<string> | undefined;
  const readableList = () => {
    listed ??= new Set([...principals].flatMap((p) => store.neighbors(tenant, p, { kind: "can-read", dir: "out", ...at }).map((e) => e.to)));
    return listed;
  };
  const readable = (doc: string): boolean =>
    bulk ? readableList().has(doc) : store.neighbors(tenant, doc, { kind: "can-read", dir: "in", ...at }).some((e) => principals.has(e.from));

  const decide = (id: string, known?: string): boolean => {
    const kind = known ?? store.node(tenant, id, asOf)?.kind;
    if (kind === undefined) return false; // there is no such node
    if (principals.has(id)) return true;
    if (kind === "document") return readable(id);
    if (kind === "project" || kind === "repo") return store.neighbors(tenant, id, { kind: "belongs-to", dir: "in", ...at }).some((e) => readableDoc(e.from));
    if (kind === "person" || kind === "team") return store.neighbors(tenant, id, { kind: "can-read", dir: "out", ...at }).some((e) => readableDoc(e.to));
    return false; // channels and tickets
  };
  const readableDoc = (id: string): boolean => store.node(tenant, id, asOf)?.kind === "document" && readable(id);
  /** `kind` may be passed when the caller already holds the node, which saves one lookup. */
  const sees = (id: string, kind?: string): boolean => {
    const known = memo.get(id);
    if (known !== undefined) return known;
    const answer = decide(id, kind);
    memo.set(id, answer);
    return answer;
  };
  return { sees, principals };
}
