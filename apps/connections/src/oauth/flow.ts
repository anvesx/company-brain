import { CodeChallengeMethod, OAuth2Client, type OAuth2Tokens } from "arctic";
import type { OAuthProvider } from "./providers.js";

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

/** What we store for an oauth account: the access token and, when the provider gave one, the refresh token. */
export const credentialOf = (t: OAuth2Tokens): string =>
  JSON.stringify({ accessToken: t.accessToken(), ...(t.hasRefreshToken() && { refreshToken: t.refreshToken() }) });
