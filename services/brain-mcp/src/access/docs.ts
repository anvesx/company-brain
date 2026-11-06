import type { AsyncGraphStore, Edge, EdgeKind } from "@anvesx/graph-store";

/**
 * Ids per `nodesOf` / `edgesOf` call. Far under the store's 100,000-id limit, so one statement stays small, and a node
 * with 4,000 neighbours costs 2 calls, not 8,000 (one `node` plus one `neighbors` per neighbour, as it used to).
 */
export const CHUNK = 2_000;

/** `fn` over `ids`, CHUNK at a time, one chunk after another so a big fan-out never floods the pool. */
export async function chunked<T>(ids: string[], fn: (part: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += CHUNK) out.push(...(await fn(ids.slice(i, i + CHUNK))));
  return out;
}

type Scope = { tenant: string; principals: Set<string>; asOf: number | undefined; bulk: boolean };

/**
 * Batched graph reads for one viewer. `readableDocs` answers "which of these ids are documents a principal can read";
 * each id is decided once and remembered, so a document shared by many projects or people is checked one time.
 * In `bulk` mode the readable list is read once per viewer, so a caller who can read nothing costs no per-chunk calls.
 */
export function docReader(store: AsyncGraphStore, s: Scope) {
  const at = s.asOf === undefined ? {} : { asOf: s.asOf };
  const edges = (ids: string[], dir: "in" | "out", kind: EdgeKind): Promise<Edge[]> =>
    chunked(ids, (part) => store.edgesOf(s.tenant, part, { dir, kinds: [kind], ...at }));

  let listed: Promise<Set<string>> | undefined;
  const readableList = () =>
    (listed ??= Promise.all([...s.principals].map((p) => store.neighbors(s.tenant, p, { kind: "can-read", dir: "out", ...at }))).then(
      (all) => new Set(all.flat().map((e) => e.to)),
    ));
  /** The ids among `ids` that exist as documents and that some principal can read. */
  const check = async (ids: string[]): Promise<Set<string>> => {
    const list = s.bulk ? await readableList() : undefined;
    const maybe = list ? ids.filter((d) => list.has(d)) : (await edges(ids, "in", "can-read")).filter((e) => s.principals.has(e.from)).map((e) => e.to);
    const real = await chunked([...new Set(maybe)], (part) => store.nodesOf(s.tenant, part, s.asOf));
    return new Set(real.filter((n) => n.kind === "document").map((n) => n.id));
  };

  const memo = new Map<string, Promise<boolean>>();
  const readableDocs = async (ids: string[]): Promise<Set<string>> => {
    const fresh = [...new Set(ids)].filter((d) => !memo.has(d));
    const found = fresh.length > 0 ? check(fresh) : undefined;
    for (const d of fresh)
      memo.set(
        d,
        found!.then((yes) => yes.has(d)),
      );
    const answers = await Promise.all(ids.map((d) => memo.get(d)!));
    return new Set(ids.filter((_, i) => answers[i]));
  };
  return { edges, readableDocs };
}
