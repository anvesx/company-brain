import type { AsyncGraphStore } from "@anvesx/graph-store";
import { chunked, docReader } from "./docs.js";

export { CHUNK } from "./docs.js";

type Item = { id: string; kind?: string | undefined };

/**
 * Visibility rule 1, answered in batches. A caller sees: themselves and their teams; documents any of them can read;
 * the projects and repos those documents belong to; people and teams that can read a visible document. Never
 * channels or tickets. Every answer is remembered for the life of one viewer.
 * `bulk` is for checking many nodes (search, graph): the readable documents are listed once, not asked about per chunk.
 */
export async function viewer(store: AsyncGraphStore, who: { tenant: string; user: string }, asOf?: number, bulk = false) {
  const { tenant, user } = who;
  const principals = new Set([user]);
  for (const e of await store.neighbors(tenant, user, { kind: "member-of", dir: "out", ...(asOf === undefined ? {} : { asOf }) })) principals.add(e.to);
  const { edges, readableDocs } = docReader(store, { tenant, principals, asOf, bulk });

  const decide = async (items: Item[]): Promise<boolean[]> => {
    const kinds = new Map(items.flatMap((it) => (it.kind === undefined ? [] : [[it.id, it.kind] as const])));
    const unknown = items.filter((it) => it.kind === undefined).map((it) => it.id);
    for (const n of await chunked(unknown, (part) => store.nodesOf(tenant, part, asOf))) kinds.set(n.id, n.kind);
    const ofKind = (...ks: string[]) => items.filter((it) => ks.includes(kinds.get(it.id) ?? "") && !principals.has(it.id)).map((it) => it.id);
    // The documents each project, repo, person or team hangs on: such a node is visible when one of them is readable.
    const via = new Map<string, string[]>();
    const add = (node: string, doc: string) => via.set(node, [...(via.get(node) ?? []), doc]);
    for (const e of await edges(ofKind("project", "repo"), "in", "belongs-to")) add(e.to, e.from);
    for (const e of await edges(ofKind("person", "team"), "out", "can-read")) add(e.from, e.to);
    const ok = await readableDocs([...ofKind("document"), ...[...via.values()].flat()]);
    return items.map((it) => {
      const kind = kinds.get(it.id);
      if (kind === undefined) return false; // there is no such node
      if (principals.has(it.id)) return true;
      if (kind === "document") return ok.has(it.id);
      return (via.get(it.id) ?? []).some((d) => ok.has(d)); // channels and tickets get no via, so they stay false
    });
  };

  const memo = new Map<string, Promise<boolean>>();
  /** One answer per item, in order. Ids not asked about before are decided together, in one batch. */
  const seesMany = (items: Item[]): Promise<boolean[]> => {
    const fresh = [...new Map(items.filter((it) => !memo.has(it.id)).map((it) => [it.id, it])).values()];
    const answers = fresh.length > 0 ? decide(fresh) : undefined;
    for (const [i, it] of fresh.entries())
      memo.set(
        it.id,
        answers!.then((a) => a[i] === true),
      );
    return Promise.all(items.map((it) => memo.get(it.id)!));
  };
  /** `kind` may be passed when the caller already holds the node, which saves one lookup. */
  const sees = async (id: string, kind?: string): Promise<boolean> => (await seesMany([{ id, kind }]))[0] === true;
  return { sees, seesMany, principals };
}
