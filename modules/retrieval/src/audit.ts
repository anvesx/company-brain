import { createHmac } from "node:crypto";
import type { AuditService } from "@brain/audit-service";
import type { SearchFn } from "./adapter.js";
import { RetrievalError } from "./errors.js";

export type AuditKey = string | Uint8Array;

/**
 * Wraps a search so results are returned only after one audit row is written; a failed write rejects.
 * Mirrors @brain/governance (a module cannot import another module, so this is a deliberate small duplicate).
 * Target = HMAC(HMAC(master, tenant), trimmed query): keyed, per tenant, no raw query stored.
 */
export function auditedSearch(search: SearchFn, audit: AuditService, auditKey: AuditKey): SearchFn {
  if (!audit) throw new RetrievalError("CONFIG", "audit is required");
  if (!auditKey || auditKey.length === 0) throw new RetrievalError("CONFIG", "auditKey is required");
  const digest = (tenantId: string, query: string): string => {
    const tenantKey = createHmac("sha256", auditKey).update(`brain-audit-target-key:${tenantId}`).digest();
    return createHmac("sha256", tenantKey).update(query.trim(), "utf8").digest("hex");
  };
  return async (request) => {
    const results = await search(request);
    const { id, tenantId } = request.principal;
    try {
      await audit.record(tenantId, { actor: id, action: "search", target: digest(tenantId, request.query), detail: { count: results.length } });
    } catch (cause) {
      throw new RetrievalError("AUDIT", "audit record failed", { cause });
    }
    return results;
  };
}
