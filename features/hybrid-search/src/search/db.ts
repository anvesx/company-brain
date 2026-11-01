import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { SearchError } from "../errors.js";
import type { Hit } from "../index.js";
import type { RankedId } from "../rrf.js";

export function sqlParams(values: unknown[]): SQLInputValue[] {
  if (!Array.isArray(values)) throw new SearchError("ACL");
  const valid = values.every((value) => value === null || ["string", "number", "bigint"].includes(typeof value) || value instanceof Uint8Array);
  if (!valid) throw new SearchError("ACL");
  return values as SQLInputValue[];
}

/** Ranked ids are chunk rowids (chunk_id is only unique per tenant). */
export function hydrate(db: DatabaseSync, ranked: RankedId[]): Hit[] {
  const find = db.prepare("SELECT chunk_id, doc_id FROM chunks WHERE rowid = ?");
  return ranked.map(({ id, score }) => {
    const row = find.get(Number(id))!;
    return { chunkId: String(row.chunk_id), docId: String(row.doc_id), score };
  });
}
