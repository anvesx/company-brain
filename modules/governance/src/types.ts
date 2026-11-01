import type { AuditService } from "@brain/audit-service";
import type { Pointer } from "@brain/core-types";
import type { QueryService, SearchRequest } from "@brain/query-service";

export interface GovernanceDeps {
  audit: AuditService;
  query: QueryService;
}

export interface Governance {
  /** Runs the search, records one audit row, then returns. Audit failure rejects with `GovernanceError` and no results. */
  search(request: SearchRequest): Promise<Pointer[]>;
  verify: AuditService["verify"];
  checkpoint: AuditService["checkpoint"];
}
