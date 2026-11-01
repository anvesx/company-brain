import { randomUUID } from "node:crypto";
import { ConnectorError, type ListedDoc } from "./contract.js";
import { pageItems } from "./paging.js";

/** Most walks kept open per connector. Starting another evicts the oldest. */
export const MAX_WALKS = 16;

export type Walks = Map<string, ListedDoc[]>;

const CURSOR = /^([0-9a-f-]{36}):([1-9]\d*)$/;

/**
 * Pages one walk. A call without a cursor scans and opens a walk; a call with a cursor continues the
 * snapshot that cursor names. A cursor this instance did not issue, or whose walk is finished or
 * evicted, throws BAD_CURSOR.
 */
export const pageWalk = async (
  walks: Walks,
  scan: () => Promise<ListedDoc[]>,
  query: { cursor?: string; limit: number },
): Promise<{ items: ListedDoc[]; nextCursor?: string }> => {
  let id: string = randomUUID();
  let docs: ListedDoc[];
  let offset: string | undefined;
  if (query.cursor === undefined) {
    docs = await scan();
  } else {
    const match = CURSOR.exec(query.cursor);
    const known = match?.[1] === undefined ? undefined : walks.get(match[1]);
    if (match?.[1] === undefined || known === undefined) throw new ConnectorError("BAD_CURSOR", "Unknown cursor");
    id = match[1];
    docs = known;
    offset = match[2];
  }
  const page = pageItems(docs, offset === undefined ? { limit: query.limit } : { limit: query.limit, cursor: offset });
  walks.delete(id);
  if (page.nextCursor === undefined) return { items: page.items };
  walks.set(id, docs);
  for (const old of walks.keys()) {
    if (walks.size <= MAX_WALKS) break;
    walks.delete(old);
  }
  return { items: page.items, nextCursor: `${id}:${page.nextCursor}` };
};
