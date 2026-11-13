import type { Edge, EdgeKind } from "@anvesx/graph-store";
import { openGate } from "@anvesx/visibility/gate";
import type { Ctx } from "../tools/schema.js";
import { chunked } from "./docs.js";

export { CHUNK } from "./docs.js";

type Item = { id: string; kind?: string | undefined };

/**
 * Visibility rule 1, answered in batches. A caller sees: themselves, their aliases and their teams; documents the shared
 * permission gate approves (current permissions, whatever `asOf` says); the projects and repos those documents belong to;
 * and the people and teams that can read a document the caller owns or administers (never co-readers of anyone else's).
 * Never channels or tickets. Every answer is remembered for the life of one viewer.
 */
export async function viewer(ctx: Ctx, asOf?: number) {
  const { store, caller } = ctx;
  const { tenant, user } = caller;
  const gate = openGate(
    store,
    { tenant, user, aliases: await ctx.aliases(user) },
    { recheck: ctx.recheck, ...(ctx.recheckLimits && { limits: ctx.recheckLimits }) },
  );
  const principals = new Set(await gate.principals());
  const edges = (ids: string[], dir: "in" | "out", kind: EdgeKind) =>
    chunked(ids, (part) => store.edgesOf(tenant, part, { dir, kinds: [kind], ...(asOf === undefined ? {} : { asOf }) }));

  const decide = async (items: Item[]): Promise<boolean[]> => {
    const kinds = new Map(items.flatMap((it) => (it.kind === undefined ? [] : [[it.id, it.kind] as const])));
    const unknown = items.filter((it) => it.kind === undefined).map((it) => it.id);
    for (const n of await chunked(unknown, (part) => store.nodesOf(tenant, part, asOf))) kinds.set(n.id, n.kind);
    const ofKind = (...ks: string[]) => items.filter((it) => ks.includes(kinds.get(it.id) ?? "") && !principals.has(it.id)).map((it) => it.id);
    // The documents each project, repo, person or team hangs on: such a node is visible when one of them is readable.
    const via = new Map<string, string[]>();
    const add = (node: string, doc: string) => via.set(node, [...(via.get(node) ?? []), doc]);
    for (const e of await edges(ofKind("project", "repo"), "in", "belongs-to")) add(e.to, e.from);
    const peopleVia = new Map<string, string[]>();
    for (const e of await edges(ofKind("person", "team"), "out", "can-read")) peopleVia.set(e.from, [...(peopleVia.get(e.from) ?? []), e.to]);
    const approved = await gate.approve([...ofKind("document"), ...[...via.values()].flat(), ...[...peopleVia.values()].flat()]);
    const ok = new Set(approved.keys());
    const owned = new Set([...approved].filter(([, a]) => a.readers !== undefined).map(([id]) => id)); // leak 4: readers are for the owner or an admin
    return items.map((it) => {
      const kind = kinds.get(it.id);
      if (kind === undefined) return false; // there is no such node
      if (principals.has(it.id)) return true;
      if (kind === "document") return ok.has(it.id);
      if (kind === "person" || kind === "team") return (peopleVia.get(it.id) ?? []).some((d) => owned.has(d));
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
  /** Leak 4: "X can read D" is shown only to D's owner or an admin, or when X is the viewer or one of their teams. */
  const edgesShown = async (list: Edge[]): Promise<boolean[]> => {
    const readerEdge = (e: Edge) => e.kind === "can-read" && !principals.has(e.from);
    const approved = await gate.approve(list.filter(readerEdge).map((e) => e.to));
    return list.map((e) => !readerEdge(e) || approved.get(e.to)?.readers !== undefined);
  };
  return { sees, seesMany, edgesShown, principals, approve: gate.approve };
}
