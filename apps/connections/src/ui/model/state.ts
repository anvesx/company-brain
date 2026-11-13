import type { Health } from "../../accounts/health/health.js";
import type { Account } from "../../accounts/types.js";

export type State = { label: string; tone: "ok" | "warn" | "off" | "busy"; reason?: string };

/** One state per account, worst first: a lost sign-in, then a running sync, then a failed one, then never synced, then healthy. */
export function stateOf(a: Pick<Account, "status" | "lastSyncAt">, h: Health): State {
  if (a.status === "needs-auth") return { label: "Needs reconnect", tone: "warn", reason: "The provider no longer accepts the saved sign-in." };
  if (h.syncing) return { label: "Syncing", tone: "busy" };
  if (h.lastError) return { label: "Error", tone: "warn", reason: h.lastError };
  if (a.lastSyncAt === null) return { label: "Not yet synced", tone: "off" };
  return { label: "Healthy", tone: "ok" };
}
