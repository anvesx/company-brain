import type { Pointer, Principal } from "@brain/core-types";
import type { QueryService } from "@brain/query-service";

export type SearchFn = (q: { query: string; limit: number; principal: Principal }) => Promise<Pointer[]>;
export type EmbedQuery = (text: string) => Promise<number[]> | number[];

/** Adapts the synchronous query service to the async search function the MCP tool expects. */
export function toSearchFn(service: QueryService, embedQuery: EmbedQuery): SearchFn {
  // An async function turns any sync throw (QueryError) and any embed failure into a rejection.
  return async ({ query, limit, principal }) => {
    const embedding = await embedQuery(query);
    return service.search({ query, principal, limit, embedding });
  };
}
