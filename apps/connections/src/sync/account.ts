import { markNeedsAuth } from "@anvesx/connector-vault";
import type { SyncReport } from "@anvesx/graph-sync";
import type { Account } from "../accounts/types.js";
import type { Deps } from "../deps.js";
import { refreshAccount, tokenFor } from "../tokens/refresh.js";
import { sourceOf } from "./connector.js";
import { closeStaleEdges } from "./data/stale.js";
import { runAccountSync } from "./run.js";

/** How one account sync ended. `failed` is the only outcome worth a retry. */
export type Outcome =
  | { kind: "done"; report: SyncReport }
  | { kind: "bad"; error: string }
  | { kind: "reauth" }
  | { kind: "failed"; code: string }
  | { kind: "missing" };

type Cfg = NonNullable<Deps["sync"]>;

/** A 401 or 403 from the provider: the connectors report both as FORBIDDEN, either on the error or as the cause of a failed sync. */
const forbidden = (e: unknown): boolean => ((e as { cause?: { code?: string } }).cause ?? (e as { code?: string })).code === "FORBIDDEN";

async function needsReconnect(d: Deps, a: Account): Promise<Outcome> {
  d.store.setStatus(a.tenant, a.id, "needs-auth");
  await markNeedsAuth(d.vault.pool, a.tenant, a.id);
  d.store.health.failed(a.tenant, a.id, "the provider rejected the credential: reconnect this account", d.now() * 1000);
  return { kind: "reauth" };
}

/** List with the token; when the provider rejects it, refresh once and list again. A second rejection, or no refresh grant, means reconnect. */
async function list(d: Deps, cfg: Cfg, a: Account, token: string, repo: string | undefined): Promise<Outcome | SyncReport | { error: string }> {
  const go = (t: string) => runAccountSync(cfg, a, t, repo, d.now() * 1000, d.catalog);
  try {
    return await go(token);
  } catch (e) {
    if (!forbidden(e)) throw e;
  }
  if ((await refreshAccount(d, a)) !== "refreshed") return needsReconnect(d, a);
  try {
    return await go((await d.vault.get(a.tenant, a.id))?.token.accessToken ?? "");
  } catch (e) {
    if (!forbidden(e)) throw e;
    return needsReconnect(d, a);
  }
}

/**
 * The one sync of one account, shared by the Sync now route and the background jobs: token from the vault (refreshed when due),
 * list into the graph, record the outcome in the account's health. Never throws; the caller decides what a `failed` outcome means.
 */
export async function syncAccount(d: Deps, tenant: string, id: string, repoArg?: string): Promise<Outcome> {
  const cur = d.store.get(tenant, id);
  if (!d.sync || !cur) return { kind: "missing" };
  if (cur.status !== "active") return { kind: "reauth" };
  const h = d.store.health;
  h.begin(id);
  try {
    const token = await tokenFor(d, cur);
    if (token === undefined) return d.store.get(tenant, id)?.status === "active" ? await needsReconnect(d, cur) : { kind: "reauth" };
    const r = await list(d, d.sync, cur, token, repoArg ?? cur.repo ?? undefined);
    if ("kind" in r) return r;
    if ("error" in r) return { kind: "bad", error: r.error }; // a bad or missing repo is the caller's input, not a failure of the connector
    d.store.setLastSync(tenant, id, d.now() * 1000);
    h.ok(tenant, id, d.now() * 1000);
    d.cursors.setCursor(tenant, sourceOf(cur), new Date(d.now() * 1000).toISOString());
    return { kind: "done", report: r };
  } catch (e) {
    const code = (e as { code?: string }).code ?? "UNKNOWN";
    h.failed(tenant, id, `source sync failed (${code})`, d.now() * 1000);
    return { kind: "failed", code };
  } finally {
    h.end(id);
    closeStaleEdges(d, cur); // a PATCH or DELETE that landed mid-sync must not be undone by the sync's writes
  }
}
