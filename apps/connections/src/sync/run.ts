import type { Registry } from "@brain/connectors";
import { type SyncReport, syncConnector } from "@brain/graph-sync";
import type { Account } from "../accounts/types.js";
import type { Deps } from "../deps.js";
import { resolveFor, withNamespace } from "../graph/namespace.js";
import { withZone } from "../graph/stamp.js";
import { forAccount } from "../graph/store.js";
import { connectorFor, sourceOf } from "./connector.js";

/** Lists the account's source into the graph. Documents carry the account's zone and owner; nothing is deleted from the source. */
export async function runAccountSync(
  cfg: NonNullable<Deps["sync"]>,
  a: Account,
  token: string,
  repo: string | undefined,
  nowMs: number,
  catalog: Registry,
): Promise<SyncReport | { error: string }> {
  const connector = connectorFor(a, token, repo, cfg, catalog);
  if ("error" in connector) return connector;
  return syncConnector({
    store: forAccount(cfg.graph, a),
    connector: withZone(withNamespace(connector, sourceOf(a)), a),
    tenant: a.tenant,
    now: () => nowMs,
    resolve: resolveFor(sourceOf(a)),
  });
}
