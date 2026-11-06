import { createHash, randomBytes } from "node:crypto";
import { type Browser, json } from "./http.js";

export const LOOPBACK = "http://127.0.0.1:8765/cb";
export type Meta = { issuer: string; authorization_endpoint: string; token_endpoint: string; registration_endpoint: string; jwks_uri: string };
export type Tokens = { access_token: string; refresh_token: string; expires_in: number; token_type: string };
export type Pkce = { verifier: string; challenge: string };
export const pkce = (): Pkce => {
  const verifier = randomBytes(32).toString("base64url");
  return { verifier, challenge: createHash("sha256").update(verifier).digest("base64url") };
};

export const discover = async (base: string): Promise<Meta> => json<Meta>(await fetch(`${base}/.well-known/oauth-authorization-server`));

/** RFC 7591 registration with no credentials, as an MCP client does. */
export const register = (meta: Meta, redirect = LOOPBACK, from?: string): Promise<Response> =>
  fetch(meta.registration_endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", ...(from ? { "x-forwarded-for": from } : {}) },
    body: JSON.stringify({ client_name: "test client", redirect_uris: [redirect], token_endpoint_auth_method: "none" }),
  });

export const clientId = async (meta: Meta, redirect = LOOPBACK): Promise<string> => {
  const res = await register(meta, redirect);
  if (!res.ok) throw new Error(`register failed ${res.status}: ${await res.text()}`);
  return (await json<{ client_id: string }>(res)).client_id;
};

export const authParams = (client: string, resource: string, p: Pkce, extra: Record<string, string> = {}) => ({
  response_type: "code",
  client_id: client,
  redirect_uri: LOOPBACK,
  scope: "openid offline_access",
  state: "s1",
  code_challenge: p.challenge,
  code_challenge_method: "S256",
  resource,
  ...extra,
});

export const authorize = async (b: Browser, meta: Meta, params: Record<string, string>) => {
  const res = await b.call(`${meta.authorization_endpoint}?${new URLSearchParams(params)}`);
  return { status: res.status, location: res.headers.get("location"), body: await res.text() };
};

/** The query string the server handed the page it redirected to (picker or consent). */
export const oauthQuery = (location: string): string => new URL(location, "http://x").search.slice(1);

export const proceed = async (b: Browser, location: string): Promise<{ url?: string; redirect?: boolean }> =>
  json(await b.call("/api/auth/oauth2/continue", { json: { postLogin: true, oauth_query: oauthQuery(location) } }));

/** Accepts at the consent page and returns the authorization code the client receives. */
export async function consent(b: Browser, location: string): Promise<string> {
  const res = await b.call("/api/auth/oauth2/consent", { json: { accept: true, oauth_query: oauthQuery(location) } });
  const { url } = await json<{ url?: string; redirect_uri?: string }>(res);
  const code = new URL(String(url)).searchParams.get("code");
  if (!code) throw new Error(`no code after consent: ${res.status}`);
  return code;
}

export const token = (meta: Meta, form: Record<string, string>): Promise<Response> =>
  fetch(meta.token_endpoint, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(form) });

/** Full flow as a client does it. With two organizations the user lands on the picker; `pick` chooses there. */
export async function connect(b: Browser, base: string, resource: string, pick?: (b: Browser) => Promise<unknown>) {
  const meta = await discover(base);
  const client = await clientId(meta);
  const p = pkce();
  let at = String((await authorize(b, meta, authParams(client, resource, p))).location);
  if (pick && new URL(at, base).pathname === "/picker") [, at] = [await pick(b), String((await proceed(b, at)).url)];
  const code = await consent(b, at);
  const res = await token(meta, { grant_type: "authorization_code", code, redirect_uri: LOOPBACK, client_id: client, code_verifier: p.verifier, resource });
  if (!res.ok) throw new Error(`token exchange failed ${res.status}: ${await res.text()}`);
  return { meta, client, tokens: await json<Tokens>(res) };
}

export const refresh = (meta: Meta, client: string, refreshToken: string, resource: string): Promise<Response> =>
  token(meta, { grant_type: "refresh_token", refresh_token: refreshToken, client_id: client, resource });

export const bearer = (t: string): HeadersInit => ({ authorization: `Bearer ${t}` });
