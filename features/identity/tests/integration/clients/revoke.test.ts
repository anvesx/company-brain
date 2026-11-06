import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { count, MINUTE } from "../../support/db.js";
import { failure, json, type Person, signUp } from "../../support/http.js";
import { bearer, connect, refresh } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
});
afterEach(() => env.close());

describe("revocation", () => {
  it("rule 11: sign-out deletes the session row and the old cookie stops working", async () => {
    const old = ada.browser.headers();
    expect(count(env.db, "select count(*) as n from session where userId = ?", ada.userId)).toBe(1);
    expect((await ada.browser.call("/api/auth/sign-out", { json: {} })).status).toBe(200);
    expect(count(env.db, "select count(*) as n from session where userId = ?", ada.userId)).toBe(0);
    expect(await env.identity.port.fromSession(old)).toBeNull();
  });

  it("rule 11: revoking a client makes its refresh token invalid_grant", async () => {
    const { meta, client, tokens } = await connect(ada.browser, env.base, env.config.resource);
    await env.identity.revokeClient(ada.browser.headers(), client);
    const res = await refresh(meta, client, tokens.refresh_token, env.config.resource);
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ error: "invalid_grant" });
  });

  it("rule 11: a revoked client's access token dies within 15 minutes", async () => {
    const { client, tokens } = await connect(ada.browser, env.base, env.config.resource);
    await env.identity.revokeClient(ada.browser.headers(), client);
    const headers = new Headers(bearer(tokens.access_token));
    env.clock.advance(15 * MINUTE + 1000);
    expect((await failure(env.identity.port.fromBearer(headers))).code).toBe("EXPIRED");
  });

  it("rule 11: revoking one client leaves another client working", async () => {
    const first = await connect(ada.browser, env.base, env.config.resource);
    const second = await connect(ada.browser, env.base, env.config.resource);
    await env.identity.revokeClient(ada.browser.headers(), first.client);
    expect((await refresh(second.meta, second.client, second.tokens.refresh_token, env.config.resource)).status).toBe(200);
  });

  it("rule 11: revoking needs a signed-in session", async () => {
    const { client } = await connect(ada.browser, env.base, env.config.resource);
    expect((await failure(env.identity.revokeClient(new Headers(), client))).code).toBe("UNAUTHENTICATED");
  });
});
