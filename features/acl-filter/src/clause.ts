import type { Principal } from "@brain/core-types";

export interface Clause {
  sql: string;
  params: unknown[];
}

// Constant text: ids only ever travel as bound params. The group list is one
// JSON param, so 1000 groups use 3 variables, not 1000.
const SQL =
  "(tenant_id = ? AND (" +
  "EXISTS (SELECT 1 FROM json_each(allow_users) WHERE value = ?) OR " +
  "EXISTS (SELECT 1 FROM json_each(allow_groups) WHERE value IN (SELECT value FROM json_each(?)))" +
  "))";

/** SQL predicate over tenant_id, allow_users, allow_groups (JSON text columns). */
export function allowClause(p: Principal): Clause {
  return { sql: SQL, params: [p.tenantId, p.id, JSON.stringify(p.groups)] };
}
