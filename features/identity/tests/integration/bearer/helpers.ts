import { signUp } from "../../support/http.js";
import { bearer, connect } from "../../support/oauth.js";
import type { Env } from "../../support/server.js";

export const MIN = 60_000;
export const JWKS = "/api/auth/jwks";
/** How many times the key set was fetched from the server so far. */
export const fetches = (on: Env): number => on.hits.get(JWKS) ?? 0;
export const verify = (on: Env, token: string) => on.identity.port.fromBearer(new Headers(bearer(token)));
/** Signs up `name` and runs the whole OAuth flow, returning the tokens. */
export const login = async (on: Env, name: string) => connect((await signUp(on, name)).browser, on.base, on.config.resource);
