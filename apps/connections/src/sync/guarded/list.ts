import { markNeedsAuth } from "@anvesx/connector-vault";
import type { SyncReport } from "@anvesx/graph-sync";
import type { Account } from "../../accounts/types.js";
import type { Deps } from "../../deps.js";
import { probeToken } from "../../tokens/probe.js";
import { refreshAccount } from "../../tokens/refresh.js";
import { runAccountSync } from "../run.js";

/** How one account sync ended. `failed` is the only outcome worth a retry. */
export type Outcome =
  | { kind: "done"; report: SyncReport }
  | { kind: "bad"; error: string }
  | { kind: "reauth" }
  | { kind: "denied" }
  | { kind: "failed"; code: string }
  | { kind: "missing" };

type Cfg = NonNullable<Deps["sync"]>;

/** FORBIDDEN from the provider (401 or 403: either on the error or as the cause of a failed sync). */
const forbidden = (e: unknown): boolean => ((e as { cause?: { code?: string } }).cause ?? (e as { code?: string })).code === "FORBIDDEN";

export async function needsReconnect(d: Deps, a: Account): Promise<Outcome> {
  d.store.setStatus(a.tenant, a.id, "needs-auth");
  await markNeedsAuth(d.vault.pool, a.tenant, a.id);
  d.store.health.failed(a.tenant, a.id, "the provider rejected the credential: reconnect this account", d.now() * 1000);
  return { kind: "reauth" };
}

async function denied(d: Deps, a: Account): Promise<Outcome> {
  d.store.health.failed(
    a.tenant,
    a.id,
    "the provider denied access (403): check the permissions on this source; the connection itself is fine",
    d.now() * 1000,
  );
  return { kind: "denied" };
}

/** List with the token. FORBIDDEN with a live token is a 403: the account stays connected. With a dead token (401) refresh once and list again; a second rejection, or no refresh grant, means reconnect. */
export async function list(d: Deps, cfg: Cfg, a: Account, token: string, repo: string | undefined): Promise<Outcome | SyncReport | { error: string }> {
  const go = (t: string) => runAccountSync(cfg, a, t, repo, d.now() * 1000, d.catalog);
  try {
    return await go(token);
  } catch (e) {
    if (!forbidden(e)) throw e;
  }
  const live = await probeToken(a.provider, cfg.githubApiUrl, token);
  if (live === "valid") return denied(d, a);
  if (live === "unknown") throw Object.assign(new Error("could not tell whether the credential or the access was refused"), { code: "UNVERIFIED" });
  if ((await refreshAccount(d, a)) !== "refreshed") return needsReconnect(d, a);
  try {
    return await go((await d.vault.get(a.tenant, a.id))?.token.accessToken ?? "");
  } catch (e) {
    if (!forbidden(e)) throw e;
    return needsReconnect(d, a);
  }
}
