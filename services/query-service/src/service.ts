import { allowClause, isAllowed } from "@brain/acl-filter";
import { QueryError, wrap } from "./errors.js";
import { liveCheck, realTimer } from "./paging/live.js";
import { DEFAULT_MAX_CANDIDATES, ids, scan } from "./paging/scan.js";
import { DEFAULT_LIVE_TIMEOUT_MS, type LiveQueryService, type QueryDeps, type SearchRequest, validate } from "./request.js";

export function createQueryService(deps: QueryDeps): LiveQueryService {
  const { index, registry, liveAcl, timer = realTimer } = deps;
  const { maxCandidates = DEFAULT_MAX_CANDIDATES, liveAclTimeoutMs = DEFAULT_LIVE_TIMEOUT_MS } = deps;
  if (!Number.isInteger(maxCandidates) || maxCandidates < 1) throw new QueryError("CONFIG");

  function prepare(request: SearchRequest) {
    const { limit, principal, text } = validate(request);
    const acl = allowClause(principal);
    const run = scan({
      limit,
      maxCandidates,
      fetch: (offset, size) => index.search({ text, embedding: request.embedding, limit: size, offset, acl }),
      visible(docId) {
        const pointer = registry.get(principal.tenantId, docId);
        // The registry is authoritative: re-check tombstone, tenant and the current ACL.
        if (!pointer || pointer.deletedAt !== null || pointer.tenantId !== principal.tenantId) return undefined;
        return isAllowed(principal, pointer.acl, pointer.tenantId) ? pointer : undefined;
      },
    });
    return { run, principal };
  }

  return {
    search(request) {
      if (liveAcl) throw new QueryError("LIVE_ACL");
      const { run } = prepare(request);
      try {
        let step = run.next();
        while (!step.done) step = run.next(ids(step.value));
        return step.value.pointers;
      } catch (error) {
        return wrap(error);
      }
    },
    async searchLive(request) {
      const { run, principal } = prepare(request);
      const meta = { liveDenied: 0, liveUnverified: 0 };
      try {
        let step = run.next();
        while (!step.done) {
          const check = liveAcl && (await liveCheck(liveAcl, timer, liveAclTimeoutMs, principal, step.value));
          meta.liveDenied += check?.denied ?? 0;
          meta.liveUnverified += check?.unverified ?? 0;
          step = run.next(check ? check.allowed : ids(step.value));
        }
        return { ...step.value, ...meta };
      } catch (error) {
        return wrap(error);
      }
    },
  };
}
