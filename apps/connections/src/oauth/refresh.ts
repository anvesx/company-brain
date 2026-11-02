import { OAuth2Client } from "arctic";
import type { Store } from "../accounts/store.js";
import type { OAuthProvider } from "./providers.js";

export type RefreshResult = "refreshed" | "unsupported" | "needs-auth";

/** The stored oauth credential JSON, or undefined when it is not an oauth credential with a refresh token. */
const refreshTokenOf = (secret: string): string | undefined => {
  try {
    const t = (JSON.parse(secret) as { refreshToken?: unknown }).refreshToken;
    return typeof t === "string" && t !== "" ? t : undefined;
  } catch {
    return undefined;
  }
};

/**
 * Trades the account's refresh token for a new access token with arctic and stores it.
 * A failure of any kind marks the account `needs-auth`; the credential is kept, never deleted.
 */
export async function refreshAccount(store: Store, p: OAuthProvider, id: string): Promise<RefreshResult> {
  const account = store.get(id);
  const secret = store.credential(id);
  const refresh = secret === undefined ? undefined : refreshTokenOf(secret);
  if (account?.kind !== "oauth" || account.provider !== p.source || refresh === undefined) return "unsupported";
  try {
    const t = await new OAuth2Client(p.clientId, p.clientSecret, p.redirectURI).refreshAccessToken(p.tokenURL, refresh, p.scopes);
    store.setCredential(id, JSON.stringify({ accessToken: t.accessToken(), refreshToken: t.hasRefreshToken() ? t.refreshToken() : refresh }));
    return "refreshed";
  } catch {
    store.setStatus(id, "needs-auth");
    return "needs-auth";
  }
}
