import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIdentity, migrateDatabase } from "../../../src/index.js";
import { failure } from "../../support/http.js";
import { bearer } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";
import { verify as check, login } from "./helpers.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const verify = (token: string) => check(env, token);

describe("expiry and errors", () => {
  it("rule 8: a proven token passes one millisecond before exp and is EXPIRED at exp", async () => {
    const ada = await login(env, "Ada");
    const token = ada.tokens.access_token;
    await verify(token);
    const expMs = Number(decodeJwt(token).exp) * 1000;
    env.clock.advance(expMs - 1 - env.clock.now());
    expect((await verify(token))?.kind).toBe("mcp");
    env.clock.advance(1);
    const error = await failure(verify(token));
    expect([error.code, error.message]).toEqual(["EXPIRED", "access token has expired"]);
  });

  it("rule 8: a key set that cannot be fetched is UNAUTHENTICATED 'signing keys are unavailable'", async () => {
    const token = (await login(env, "Ada")).tokens.access_token;
    // The issuer path /missing/api/auth/jwks answers 404 from the real server.
    const config = { ...env.config, baseUrl: `${env.base}/missing` };
    await migrateDatabase(config);
    const elsewhere = createIdentity(config);
    await elsewhere.migrate();
    const error = await failure(elsewhere.port.fromBearer(new Headers(bearer(token))));
    expect([error.code, error.message]).toEqual(["UNAUTHENTICATED", "signing keys are unavailable"]);
  });

  it("rule 8: a token for another resource is WRONG_AUDIENCE with its message", async () => {
    const token = (await login(env, "Ada")).tokens.access_token;
    const other = createIdentity({ ...env.config, resource: `${env.base}/other` });
    const error = await failure(other.port.fromBearer(new Headers(bearer(token))));
    expect([error.code, error.message]).toEqual(["WRONG_AUDIENCE", "token is for another resource"]);
  });

  it("rule 8: a malformed token is UNAUTHENTICATED 'access token is not valid'", async () => {
    const error = await failure(verify("not.a.jwt"));
    expect([error.code, error.message]).toEqual(["UNAUTHENTICATED", "access token is not valid"]);
  });
});
