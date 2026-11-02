import { type SyncReport, syncConnector } from "@brain/graph-sync";
import type { Account } from "../accounts/types.js";
import type { Deps } from "../deps.js";
import { withOwner, withZone } from "../graph/stamp.js";
import { connectorFor } from "./connector.js";

/** Lists the account's source into the graph. Documents carry the account's zone and owner; nothing is deleted from the source. */
export async function runAccountSync(
  cfg: NonNullable<Deps["sync"]>,
  a: Account,
  token: string,
  repo: string | undefined,
  nowMs: number,
): Promise<SyncReport | { error: string }> {
  const connector = connectorFor(a, token, repo, cfg);
  if ("error" in connector) return connector;
  return syncConnector({ store: withOwner(cfg.graph, a.owner), connector: withZone(connector, a), tenant: a.tenant, now: () => nowMs });
}
