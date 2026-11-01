import { allowClause, isAllowed } from "@brain/acl-filter";
import { type Pointer, type Principal, PrincipalSchema } from "@brain/core-types";
import { SearchError, type SearchIndex } from "@brain/hybrid-search";
import type { Registry } from "@brain/pointer-registry";
import { QueryError } from "./errors.js";

export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

export type QueryDeps = { index: Pick<SearchIndex, "search">; registry: Pick<Registry, "get"> };
export type SearchRequest = { query: string; principal: Principal; embedding: number[]; limit?: number };
export interface QueryService {
  search(request: SearchRequest): Pointer[];
}

export function createQueryService({ index, registry }: QueryDeps): QueryService {
  return {
    search(request: SearchRequest): Pointer[] {
      const limit = request?.limit ?? DEFAULT_LIMIT;
      if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new QueryError("LIMIT");
      const parsed = PrincipalSchema.safeParse(request.principal);
      if (!parsed.success) throw new QueryError("PRINCIPAL");
      const query = typeof request.query === "string" ? request.query.trim() : "";
      if (query === "") throw new QueryError("EMPTY_QUERY");
      const principal = parsed.data;
      try {
        // Fetch the maximum so hidden hits cannot starve the page; the index ACL is only a prefilter.
        const hits = index.search({ text: query, embedding: request.embedding, limit: MAX_LIMIT, acl: allowClause(principal) });
        const seen = new Set<string>();
        const out: Pointer[] = [];
        for (const { docId } of hits) {
          if (seen.has(docId)) continue;
          seen.add(docId);
          const pointer = registry.get(principal.tenantId, docId);
          // The registry is authoritative: re-check tombstone, tenant and the current ACL.
          if (!pointer || pointer.deletedAt !== null || pointer.tenantId !== principal.tenantId) continue;
          if (!isAllowed(principal, pointer.acl, pointer.tenantId)) continue;
          out.push(pointer);
          if (out.length === limit) break;
        }
        return out;
      } catch (error) {
        throw new QueryError(error instanceof SearchError && error.code === "DIM" ? "EMBEDDING" : "BACKEND", error);
      }
    },
  };
}
