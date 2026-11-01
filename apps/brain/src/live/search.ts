import type { AuditService } from "@brain/audit-service";
import { createQueryService, DEFAULT_LIMIT, type QueryDeps } from "@brain/query-service";
import { auditedOutcome, createConnectorLiveAcl, toOutcomeFn, toSearchFn } from "@brain/retrieval";
import type { BrainApp, BrainDeps } from "../types.js";

type Parts = Pick<QueryDeps, "index" | "registry"> & { deps: BrainDeps; audit: AuditService; userTokenFor: NonNullable<BrainDeps["userTokenFor"]> };

/**
 * Audited search that re-checks every hit at the source with the user's token (see `createConnectorLiveAcl`).
 * A failed or timed-out check rejects with RetrievalError LIVE_ACL; nothing is returned. Same audit rows as governance.
 */
export function liveSearch({ deps, index, registry, audit, userTokenFor }: Parts): BrainApp["search"] {
  const liveAcl = createConnectorLiveAcl({ connectorFor: deps.connectorFor, userTokenFor, pointerFor: (tenantId, id) => registry.get(tenantId, id) });
  const timeout = deps.liveAclTimeoutMs;
  const service = createQueryService({ index, registry, liveAcl, ...(timeout !== undefined && { liveAclTimeoutMs: timeout }) });
  const run = toSearchFn(auditedOutcome(toOutcomeFn(service, deps.embedQuery), audit, deps.auditKey));
  return ({ query, principal, limit = DEFAULT_LIMIT }) => run({ query, principal, limit });
}
