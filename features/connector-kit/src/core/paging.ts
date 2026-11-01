import { ConnectorError } from "./contract.js";

export const pageItems = <T>(items: readonly T[], query: { cursor?: string; limit: number }): { items: T[]; nextCursor?: string } => {
  if (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 1000) {
    throw new RangeError("limit must be an integer from 1 to 1000");
  }
  const cursor = query.cursor;
  let start = 0;
  if (cursor !== undefined) {
    if (!/^[1-9]\d*$/.test(cursor)) throw new ConnectorError("BAD_CURSOR", "Invalid cursor");
    start = Number(cursor);
    if (!Number.isSafeInteger(start) || start >= items.length) {
      throw new ConnectorError("BAD_CURSOR", "Cursor is outside this result set");
    }
  }
  const page = items.slice(start, start + query.limit);
  const next = start + page.length;
  return next < items.length ? { items: page, nextCursor: String(next) } : { items: page };
};
