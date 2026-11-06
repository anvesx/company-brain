import type { AsyncGraphStore } from "@anvesx/graph-store";

/**
 * Visibility rule 1 as a point check. A caller sees: themselves and their teams; documents any of them
 * can read; the projects and repos those documents belong to; people and teams that can read a visible
 * document. Never channels or tickets. Answers are remembered for the life of one viewer.
 * `bulk` is for checking many nodes (search, graph): the readable documents are listed once, not asked about one by one.
 */
export async function viewer(store: AsyncGraphStore, who: { tenant: string; user: string }, asOf?: number, bulk = false) {
  const { tenant, user } = who;
  const at = asOf === undefined ? {} : { asOf };
  const principals = new Set([user]);
  for (const e of await store.neighbors(tenant, user, { kind: "member-of", dir: "out", ...at })) principals.add(e.to);

  const memo = new Map<string, Promise<boolean>>();
  let listed: Promise<Set<string>> | undefined;
  const readableList = () =>
    (listed ??= Promise.all([...principals].map((p) => store.neighbors(tenant, p, { kind: "can-read", dir: "out", ...at }))).then(
      (all) => new Set(all.flat().map((e) => e.to)),
    ));
  const readable = async (doc: string): Promise<boolean> =>
    bulk ? (await readableList()).has(doc) : (await store.neighbors(tenant, doc, { kind: "can-read", dir: "in", ...at })).some((e) => principals.has(e.from));
  const readableDoc = async (id: string): Promise<boolean> => (await store.node(tenant, id, asOf))?.kind === "document" && (await readable(id));
  const any = async (ids: string[]): Promise<boolean> => {
    for (const id of ids) if (await readableDoc(id)) return true;
    return false;
  };

  const decide = async (id: string, known?: string): Promise<boolean> => {
    const kind = known ?? (await store.node(tenant, id, asOf))?.kind;
    if (kind === undefined) return false; // there is no such node
    if (principals.has(id)) return true;
    if (kind === "document") return readable(id);
    if (kind === "project" || kind === "repo") return any((await store.neighbors(tenant, id, { kind: "belongs-to", dir: "in", ...at })).map((e) => e.from));
    if (kind === "person" || kind === "team") return any((await store.neighbors(tenant, id, { kind: "can-read", dir: "out", ...at })).map((e) => e.to));
    return false; // channels and tickets
  };
  /** `kind` may be passed when the caller already holds the node, which saves one lookup. */
  const sees = (id: string, kind?: string): Promise<boolean> => {
    let answer = memo.get(id);
    if (answer === undefined) {
      answer = decide(id, kind);
      memo.set(id, answer);
    }
    return answer;
  };
  return { sees, principals };
}
