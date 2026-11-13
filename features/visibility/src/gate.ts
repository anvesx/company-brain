import { type Approved, decide, type Gate, type PermStore, type Who } from "./index.js";
import { type Caller, DEFAULT_LIMITS, type Doc, type Recheck, type RecheckLimits, stillReadable } from "./live.js";
import { zoneOf, zonesFor } from "./zone.js";

export type { Approved, Caller, Doc, Gate, PermStore, Recheck, RecheckLimits, Who };
export { DEFAULT_LIMITS, stillReadable, zoneOf, zonesFor };

const CHUNK = 2_000;
const chunks = <T>(all: T[]): T[][] => Array.from({ length: Math.ceil(all.length / CHUNK) }, (_, i) => all.slice(i * CHUNK, (i + 1) * CHUNK));

/** The one permission gate every read route calls. A viewer's answers are remembered for the life of the gate. */
export function openGate(store: PermStore, who: Who, opts: { recheck?: Recheck | undefined; limits?: RecheckLimits } = {}): Gate {
  const { tenant, user } = who;
  const names = [...new Set([user, ...(who.aliases ?? [])])].filter((n) => n !== "");
  const memo = new Map<string, Approved | undefined>();
  const asked = async (ids: string[], dir: "in" | "out", kind: "member-of" | "can-read") => await store.edgesOf(tenant, ids, { dir, kinds: [kind] });
  const teams = Promise.resolve().then(async () => [...new Set((await asked(names, "out", "member-of")).map((e) => e.to))]);
  const principals = async () => [...new Set([...names, ...(await teams)])];

  const judge = async (ids: string[]): Promise<void> => {
    const viewer = { tenant, user, aliases: await principals(), role: who.role ?? "member", zones: zonesFor(user, await teams) };
    const docs = (await store.nodesOf(tenant, ids)).filter((n) => n.kind === "document");
    const readers = new Map<string, string[]>();
    for (const e of await asked(
      docs.map((d) => d.id),
      "in",
      "can-read",
    ))
      readers.set(e.to, [...(readers.get(e.to) ?? []), e.from]);
    const passed = new Map<string, Approved>();
    for (const doc of docs) {
      const acl = [{ at: 0, allow: readers.get(doc.id) ?? [] }];
      const out = decide(viewer, { tenant: doc.tenant, id: doc.id, owner: doc.props["owner"] ?? "", zone: zoneOf(doc.props), acl });
      if (out.visible) passed.set(doc.id, { doc, readers: out.readers });
    }
    const live = await stillReadable(
      [...passed.values()].map((p) => p.doc),
      { tenant, user },
      opts.recheck,
      opts.limits,
    );
    for (const id of ids) memo.set(id, undefined);
    for (const d of live) memo.set(d.id, passed.get(d.id));
  };

  return {
    principals,
    async approve(ids) {
      const all = ids ?? (await asked(await principals(), "out", "can-read")).map((e) => e.to);
      for (const part of chunks([...new Set(all)].filter((id) => !memo.has(id)).sort())) await judge(part);
      return new Map(all.flatMap((id) => (memo.get(id) ? [[id, memo.get(id) as Approved] as const] : [])));
    },
  };
}
