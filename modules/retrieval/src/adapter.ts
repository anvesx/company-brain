import type { Pointer, Principal } from "@brain/core-types";
import { type LiveQueryService, QueryError, type SearchResult } from "@brain/query-service";
import { RetrievalError } from "./errors.js";

export type SearchRequest = { query: string; limit: number; principal: Principal };
export type SearchFn = (q: SearchRequest) => Promise<Pointer[]>;
export type EmbedQuery = (text: string) => Promise<number[]> | number[];

/**
 * Typed result of one search. `truncated` (the scan hit its candidate cap, so more matches may exist) rides on ok results.
 * LIVE_ACL means the live ACL check could not vouch for any hit; nothing is returned (fail closed).
 */
export type Outcome = ({ ok: true } & SearchResult) | { ok: false; code: "LIVE_ACL" };
export type OutcomeFn = (q: SearchRequest) => Promise<Outcome>;

const liveFailure: Outcome = { ok: false, code: "LIVE_ACL" };

/** Embeds the query, then pages through the query service (`searchLive`). Other failures reject. */
export function toOutcomeFn(service: Pick<LiveQueryService, "searchLive">, embedQuery: EmbedQuery): OutcomeFn {
  return async ({ query, limit, principal }) => {
    const embedding = await embedQuery(query);
    try {
      const result = await service.searchLive({ query, principal, limit, embedding });
      // Nothing returned and something could not be verified: a verifier outage must not look like "no results".
      return result.pointers.length === 0 && result.liveUnverified > 0 ? liveFailure : { ok: true, ...result };
    } catch (error) {
      if (error instanceof QueryError && error.code === "LIVE_ACL") return liveFailure;
      throw error;
    }
  };
}

/** The pointer-only function the MCP tool expects. A LIVE_ACL outcome rejects, so the caller sees a safe error. */
export function toSearchFn(outcome: OutcomeFn): SearchFn {
  return async (request) => {
    const result = await outcome(request);
    if (!result.ok) throw new RetrievalError(result.code, "live acl check failed");
    return result.pointers;
  };
}
