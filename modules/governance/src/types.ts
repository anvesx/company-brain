import type { AuditService } from "@brain/audit-service";
import type { Pointer } from "@brain/core-types";
import type { QueryService, SearchRequest } from "@brain/query-service";

export interface GovernanceDeps {
  audit: AuditService;
  query: QueryService;
  /** Master secret for the audit target digest. Required and non-empty; a per-tenant key is derived from it. */
  auditKey: string | Uint8Array;
}

export interface Governance {
  /** Runs the search, records one audit row, then returns. Audit failure rejects with `GovernanceError` and no results. */
  search(request: SearchRequest): Promise<Pointer[]>;
  verify: AuditService["verify"];
  checkpoint: AuditService["checkpoint"];
}
