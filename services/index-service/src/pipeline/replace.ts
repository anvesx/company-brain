import type { Pointer } from "@brain/core-types";
import type { SearchIndex } from "@brain/hybrid-search";
import type { Registry } from "@brain/pointer-registry";
import { IndexServiceError } from "../types.js";
import type { Row } from "./prepare.js";

type Stores = { registry: Registry; index: SearchIndex };

/** Put the registry back to what it was before this event. */
export function restore({ registry }: Stores, prior: Pointer | undefined, p: Pointer): void {
  try {
    if (prior) registry.upsert(prior);
    else registry.tombstone(p.tenantId, p.id, p.updatedAt);
  } catch (error) {
    throw new IndexServiceError("ROLLBACK_FAILED", error);
  }
}

/** A search validates the embedding first, so a wrong dimension fails before any chunk is removed. */
export function probe({ index }: Stores, row: Row | undefined): void {
  if (!row) return;
  try {
    index.search({ text: "x", embedding: row.embedding, limit: 1, acl: { sql: "0", params: [] } });
  } catch (error) {
    throw new IndexServiceError("EMBED_INVALID", error);
  }
}

/** Swap a doc's chunks. Old chunks survive any failure of `remove`; see README for the `add` case. */
export function replace(s: Stores, p: Pointer, rows: Row[], prior: Pointer | undefined): void {
  const { index } = s;
  try {
    index.remove(p.id, p.tenantId);
  } catch (error) {
    restore(s, prior, p);
    throw new IndexServiceError("INDEX_FAILED", error);
  }
  try {
    for (const { chunk, embedding } of rows) {
      const { id: chunkId, text } = chunk;
      index.add({ chunkId, docId: p.id, tenantId: p.tenantId, text, embedding, acl: p.acl });
    }
  } catch (error) {
    try {
      index.remove(p.id, p.tenantId);
    } catch {}
    restore(s, undefined, p);
    throw new IndexServiceError("INDEX_FAILED", error);
  }
}
