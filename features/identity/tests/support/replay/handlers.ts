import type { IncomingMessage } from "node:http";
import type { Grants, ReplayUser } from "./tokens.js";

/** How the token endpoint answers a refresh: normally, as a revoked grant, or as a provider outage. */
export type Mode = "ok" | "invalid_grant" | "server_error";
export type Answer = { status: number; body?: unknown; location?: string };

/** The replay provider's live state. Tests read the counters and flip `mode` and `user`. */
export type State = {
  clientId: string;
  clientSecret: string;
  grants: Grants;
  user: ReplayUser;
  mode: Mode;
  expiresIn: number;
  /** A refresh waits on this before it answers (null = answer at once), so a test can park one caller mid-call. */
  hold: Promise<void> | null;
  calls: { authorize: number; token: number; refresh: number; userinfo: number };
  lastAuthorize: URL | null;
  idToken: ((user: ReplayUser, nonce: string | null) => Promise<string>) | null;
};

const fail = (status: number, error: string): Answer => ({ status, body: { error } });

/** GET /authorize: the person is already signed in and consents at once, so it redirects straight back. */
export function authorize(s: State, url: URL): Answer {
  s.calls.authorize += 1;
  s.lastAuthorize = url;
  const q = url.searchParams;
  const redirect = q.get("redirect_uri");
  if (q.get("client_id") !== s.clientId || !redirect || q.get("response_type") !== "code") return fail(400, "invalid_request");
  if (q.has("code_challenge") && q.get("code_challenge_method") !== "S256") return fail(400, "invalid_request");
  const code = s.grants.issueCode({ user: { ...s.user }, redirect, challenge: q.get("code_challenge"), nonce: q.get("nonce") });
  const back = new URL(redirect);
  back.searchParams.set("code", code);
  back.searchParams.set("state", q.get("state") ?? "");
  return { status: 302, location: back.toString() };
}

/** POST /token: client_secret_post or HTTP Basic; authorization_code with PKCE, or a rotating refresh_token. */
export async function token(s: State, req: IncomingMessage, form: URLSearchParams): Promise<Answer> {
  s.calls.token += 1;
  const basic = /^Basic (.+)$/.exec(req.headers.authorization ?? "")?.[1];
  const [id, secret] = basic
    ? Buffer.from(basic, "base64").toString("utf8").split(":").map(decodeURIComponent)
    : [form.get("client_id"), form.get("client_secret")];
  if (id !== s.clientId || secret !== s.clientSecret) return fail(401, "invalid_client");
  if (form.get("grant_type") === "refresh_token") return refresh(s, form.get("refresh_token") ?? "");
  if (form.get("grant_type") !== "authorization_code") return fail(400, "unsupported_grant_type");
  const code = s.grants.redeem(form.get("code") ?? "", form.get("redirect_uri") ?? "", form.get("code_verifier"));
  if (!code) return fail(400, "invalid_grant");
  const pair = s.grants.grant(code.user);
  const idToken = s.idToken ? { id_token: await s.idToken(code.user, code.nonce) } : {};
  return { status: 200, body: { ...tokens(s, pair), ...idToken } };
}

async function refresh(s: State, value: string): Promise<Answer> {
  s.calls.refresh += 1;
  if (s.hold) await s.hold;
  if (s.mode === "server_error") return fail(500, "server_error");
  const pair = s.mode === "ok" ? s.grants.rotate(value) : null;
  return pair ? { status: 200, body: tokens(s, pair) } : fail(400, "invalid_grant");
}

const tokens = (s: State, pair: { access: string; refresh: string }) => ({
  access_token: pair.access,
  refresh_token: pair.refresh,
  token_type: "Bearer",
  expires_in: s.expiresIn,
  scope: "read",
});

/** GET /userinfo: only a token this provider issued gets the profile back. */
export function userinfo(s: State, req: IncomingMessage): Answer {
  s.calls.userinfo += 1;
  const bearer = /^Bearer (.+)$/.exec(req.headers.authorization ?? "")?.[1] ?? "";
  const user = s.grants.userFor(bearer);
  return user ? { status: 200, body: { id: user.sub, ...user } } : fail(401, "invalid_token");
}
