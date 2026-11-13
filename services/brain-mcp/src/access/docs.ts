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
