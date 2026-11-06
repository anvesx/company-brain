import type { AuthContext } from "better-auth";
import type { Auth } from "./auth/options.js";
import type { ResolvedConfig } from "./config.js";
import { IdentityError } from "./errors.js";
import { createBearerVerifier } from "./guard/bearer.js";
import { readSession, resolveTenant, sameToken, signCsrf } from "./guard/session.js";

/** Who is calling: a signed-in browser session or an MCP client holding an access token. */
export interface Caller {
  user: string;
  tenant: string;
  kind: "session" | "mcp";
  scopes: string[];
}

export interface IdentityPort {
  fromSession(headers: Headers): Promise<Caller | null>;
  fromBearer(headers: Headers): Promise<Caller | null>;
  require(headers: Headers): Promise<Caller>;
  accessToken(user: string, providerId: string, accountId: string): Promise<string>;
}

/** The three ways to learn the caller. A missing credential is null. A bad credential throws IdentityError. */
export const createPort = (auth: Auth, cfg: ResolvedConfig, adapter: () => Promise<AuthContext["adapter"]>): Omit<IdentityPort, "accessToken"> => {
  const verify = createBearerVerifier(cfg);
  const fromSession: IdentityPort["fromSession"] = async (headers) => {
    const view = await readSession(auth, headers);
    if (!view) return null;
    const tenant = await resolveTenant(await adapter(), view);
    if (tenant === null) throw new IdentityError("NO_ORGANIZATION", "the session has no active organization");
    return { user: view.userId, tenant, kind: "session", scopes: [] };
  };

  const fromBearer: IdentityPort["fromBearer"] = async (headers) => {
    const header = headers.get("authorization");
    if (header === null) return null;
    const token = /^Bearer (\S+)$/i.exec(header)?.[1];
    if (!token) throw new IdentityError("UNAUTHENTICATED", "the authorization header is not a bearer token");
    const claims = await verify(token);
    if (!claims.org_id) throw new IdentityError("NO_ORGANIZATION", "the token names no organization");
    return { user: claims.sub, tenant: claims.org_id, kind: "mcp", scopes: (claims.scope ?? "").split(" ").filter(Boolean) };
  };

  return {
    fromSession,
    fromBearer,
    require: async (headers) => {
      const caller = headers.has("authorization") ? await fromBearer(headers) : await fromSession(headers);
      if (!caller) throw new IdentityError("UNAUTHENTICATED", "sign in first");
      return caller;
    },
  };
};

/** Wraps a handler so only valid callers reach it. Every failure is a 401 pointing at the metadata. */
export const createProtect = (port: IdentityPort, cfg: ResolvedConfig) => {
  const challenge = `Bearer resource_metadata="${cfg.baseUrl}/.well-known/oauth-protected-resource${new URL(cfg.resource).pathname.replace(/\/$/, "")}"`;
  return (handler: (req: Request, caller: Caller) => Promise<Response>) =>
    async (req: Request): Promise<Response> => {
      try {
        return await handler(req, await port.require(req.headers));
      } catch (error) {
        if (!(error instanceof IdentityError)) throw error;
        return Response.json({ error: "unauthorized", code: error.code }, { status: 401, headers: { "www-authenticate": challenge } });
      }
    };
};

/** CSRF tokens for forms: bound to the session, so another session or a signed-out browser fails. */
export const createCsrf = (auth: Auth, cfg: ResolvedConfig) => ({
  issue: async (headers: Headers): Promise<string> => {
    const view = await readSession(auth, headers);
    if (!view) throw new IdentityError("UNAUTHENTICATED", "sign in first");
    return signCsrf(cfg.secret, view.sessionId);
  },
  verify: async (headers: Headers, token: string): Promise<boolean> => {
    const view = await readSession(auth, headers);
    return view !== null && token !== "" && sameToken(token, signCsrf(cfg.secret, view.sessionId));
  },
});
