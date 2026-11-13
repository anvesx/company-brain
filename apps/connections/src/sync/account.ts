import type { Deps } from "../deps.js";
import { tokenFor } from "../tokens/refresh.js";
import { sourceOf } from "./connector.js";
import { closeStaleEdges } from "./data/stale.js";
import { list, needsReconnect, type Outcome } from "./guarded/list.js";

export type { Outcome };

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
    if (code === "SUPERSEDED") return { kind: "superseded" }; // a newer sync of this account took over; it records the outcome
    h.failed(tenant, id, `source sync failed (${code})`, d.now() * 1000);
    return { kind: "failed", code };
  } finally {
    h.end(id);
    closeStaleEdges(d, cur); // a PATCH or DELETE that landed mid-sync must not be undone by the sync's writes
  }
}
