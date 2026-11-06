import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { type Answer, authorize, type State, token, userinfo } from "./handlers.js";
import { Grants, type ReplayUser, signer } from "./tokens.js";

export type Replay = Awaited<ReturnType<typeof startReplay>>;
export type { Mode } from "./handlers.js";

const readForm = async (req: IncomingMessage): Promise<URLSearchParams> => {
  let raw = "";
  for await (const chunk of req) raw += String(chunk);
  return new URLSearchParams(raw);
};

const send = (res: ServerResponse, a: Answer): void => {
  if (a.location) res.writeHead(a.status, { location: a.location }).end();
  else res.writeHead(a.status, { "content-type": "application/json" }).end(JSON.stringify(a.body ?? {}));
};

/**
 * A real OAuth 2.0 provider on a local port: discovery, authorize, token and userinfo, in memory.
 * `oidc: true` adds a signing key and id tokens, as Google does; without it the provider is plain OAuth 2.0.
 */
export async function startReplay(opts: { oidc?: boolean; clientId?: string; clientSecret?: string } = {}) {
  const server = createServer((req, res) => {
    route(req).then(
      (answer) => send(res, answer),
      (error: unknown) => send(res, { status: 500, body: { error: String(error) } }),
    );
  });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const user: ReplayUser = { sub: "replay-user-1", email: "ada@provider.example", email_verified: true, name: "Ada Provider" };
  const state: State = {
    clientId: opts.clientId ?? "replay-client",
    clientSecret: opts.clientSecret ?? "replay-client-secret",
    grants: new Grants(),
    user,
    mode: "ok",
    expiresIn: 3600,
    hold: null,
    calls: { authorize: 0, token: 0, refresh: 0, userinfo: 0 },
    lastAuthorize: null,
    idToken: null,
  };
  const keys = await signer(base, state.clientId);
  if (opts.oidc) state.idToken = (who, nonce) => keys.idToken(who, nonce, Date.now());
  const discovery = {
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    userinfo_endpoint: `${base}/userinfo`,
    ...(opts.oidc ? { jwks_uri: `${base}/jwks`, id_token_signing_alg_values_supported: ["RS256"] } : {}),
  };

  async function route(req: IncomingMessage): Promise<Answer> {
    const url = new URL(req.url ?? "/", base);
    if (url.pathname === "/.well-known/openid-configuration") return { status: 200, body: discovery };
    if (url.pathname === "/jwks" && opts.oidc) return { status: 200, body: keys.jwks };
    if (url.pathname === "/authorize") return authorize(state, url);
    if (url.pathname === "/token" && req.method === "POST") return token(state, req, await readForm(req));
    if (url.pathname === "/userinfo") return userinfo(state, req);
    return { status: 404, body: { error: "not_found" } };
  }

  return {
    base,
    discoveryUrl: `${base}/.well-known/openid-configuration`,
    state,
    /** Mints a token pair this provider will honour, for seeding rows without a browser flow. */
    grant: () => state.grants.grant({ ...state.user }),
    close: () => new Promise<void>((done) => server.close(() => done())),
  };
}
