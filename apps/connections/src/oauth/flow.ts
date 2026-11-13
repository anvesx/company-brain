import { CodeChallengeMethod, decodeIdToken, OAuth2Client, type OAuth2Tokens } from "arctic";
import type { Account } from "../accounts/types.js";
import type { Deps } from "../deps.js";
import { createWithToken } from "../tokens/open.js";
import type { OAuthProvider } from "./providers.js";
import type { Pending } from "./state/pending.js";

const client = (p: OAuthProvider) => new OAuth2Client(p.clientId, p.clientSecret, p.redirectURI);

export function authorizeURL(p: OAuthProvider, state: string, verifier: string): URL {
  const c = client(p);
  const url = p.pkce
    ? c.createAuthorizationURLWithPKCE(p.authorizeURL, state, CodeChallengeMethod.S256, verifier, p.scopes)
    : c.createAuthorizationURL(p.authorizeURL, state, p.scopes);
  for (const [k, v] of Object.entries(p.extraParams)) url.searchParams.set(k, v);
  return url;
}

export const exchange = (p: OAuthProvider, code: string, verifier: string): Promise<OAuth2Tokens> =>
  client(p).validateAuthorizationCode(p.tokenURL, code, p.pkce ? verifier : null);

/** What the vault seals for an oauth account: the access token, the refresh token when the provider gave one, and when the access token expires. */
export const credentialOf = (t: OAuth2Tokens) => ({
  accessToken: t.accessToken(),
  ...(t.hasRefreshToken() && { refreshToken: t.refreshToken() }),
  expiresAt: "expires_in" in t.data ? t.accessTokenExpiresAt() : null,
});

/** Who the provider says signed in, when the token answer itself says: a Slack workspace name or the email in a Google id token. Never a second call. */
export function identityOf(t: OAuth2Tokens): string | undefined {
  const team = (t.data as { team?: { name?: unknown } }).team?.name;
  if (typeof team === "string" && team !== "") return team;
  try {
    const email = (decodeIdToken(t.idToken()) as { email?: unknown }).email;
    return typeof email === "string" && email !== "" ? email : undefined;
  } catch {
    return undefined;
  }
}

/** Stores the signed-in account. Signing in again as the same identity renews that account (same id, repo and history) instead of adding a twin. */
export async function saveAccount(d: Deps, pend: Pending, p: OAuthProvider, tokens: OAuth2Tokens): Promise<{ account: Account; created: boolean }> {
  const cred = credentialOf(tokens);
  const who = identityOf(tokens);
  const label = who && pend.label === `${pend.provider} account` ? who : pend.label;
  const { tenant, user } = pend.caller;
  const same = d.store.findOauth(tenant, user, p.source, label);
  if (!same)
    return {
      account: await createWithToken(d, { tenant, owner: user, provider: p.source, label, kind: "oauth", access: pend.access, dataZone: pend.dataZone }, cred),
      created: true,
    };
  const { expiresAt, ...sealed } = cred;
  await d.vault.put(tenant, { id: same.id, owner: same.owner, provider: same.provider, token: sealed, expiresAt });
  d.store.setStatus(tenant, same.id, "active");
  d.store.health.ok(tenant, same.id);
  return { account: d.store.get(tenant, same.id) as Account, created: false };
}
