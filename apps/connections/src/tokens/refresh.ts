import { httpExchange, type Outcome, refreshOne } from "@anvesx/connector-vault";
import type { Account } from "../accounts/types.js";
import type { Deps } from "../deps.js";
import { providerFor } from "../oauth/providers.js";

/** Refreshes this account's token in the vault when its provider has a refresh grant configured; `needs-auth` also flips the account row. */
export async function refreshAccount(d: Deps, a: Account): Promise<Outcome> {
  const m = d.catalog.get(a.provider, a.tenant);
  const p = m && providerFor(d.oauth, m);
  if (a.kind !== "oauth" || !p) return "unsupported";
  const out = await refreshOne(d.vault, a.tenant, a.id, httpExchange(p.tokenURL, p.clientId, p.clientSecret));
  if (out === "needs-auth") d.store.setStatus(a.tenant, a.id, "needs-auth");
  return out;
}

/** The bearer to list with. An oauth token that is expired or near expiry is refreshed first; a token whose expiry is unknown is refreshed only after the provider rejects it. Undefined: no usable token. */
export async function tokenFor(d: Deps, a: Account): Promise<string | undefined> {
  let row = await d.vault.get(a.tenant, a.id);
  const soon = row?.expiresAt != null && row.expiresAt.getTime() <= d.now() * 1000 + 60_000;
  if (row?.token.refreshToken !== undefined && soon) {
    await refreshAccount(d, a);
    row = await d.vault.get(a.tenant, a.id); // read again whatever the outcome: a refused refresh leaves the row in needs-auth
  }
  return row?.status === "active" ? row.token.accessToken : undefined;
}
