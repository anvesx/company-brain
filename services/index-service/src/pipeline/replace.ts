import type { Acl, Pointer } from "@brain/core-types";
import type { SearchIndex } from "@brain/hybrid-search";
import type { Registry } from "@brain/pointer-registry";
import { IndexServiceError } from "../types.js";
import type { Row } from "./prepare.js";

type Stores = { registry: Registry; index: SearchIndex };

/** Access never widens on a failed update: keep only what both the old and the incoming ACL allow. */
function narrow(prior: Acl, next: Acl): Acl {
  const both = (a: string[], b: string[]) => a.filter((x) => b.includes(x));
  return {
    allowUsers: both(prior.allowUsers, next.allowUsers),
    allowGroups: both(prior.allowGroups, next.allowGroups),
    version: Math.max(prior.version, next.version),
  };
}

/**
 * Undo a failed event. The prior pointer comes back (so a replay retries), but with the narrowed ACL, in the
 * registry and in the index's own ACL copy, so a revocation is never undone. A brand new doc is tombstoned.
 */
export function restore({ registry, index }: Stores, prior: Pointer | undefined, p: Pointer): void {
  try {
    if (!prior) return void registry.tombstone(p.tenantId, p.id, p.updatedAt);
    const acl = narrow(prior.acl, p.acl);
    index.updateAcl(p.id, p.tenantId, acl);
    registry.upsert({ ...prior, acl });
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
    let cleanup: { error: unknown } | undefined;
    try {
      index.remove(p.id, p.tenantId);
    } catch (e) {
      cleanup = { error: e };
    }
    restore(s, undefined, p);
    if (!cleanup) throw new IndexServiceError("INDEX_FAILED", error);
    throw new IndexServiceError("CLEANUP_FAILED", new AggregateError([error, cleanup.error], "index add failed and cleanup failed"));
  }
}
