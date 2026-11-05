import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DAY, one, toMs } from "../support/db.js";
import { json, signUp } from "../support/http.js";
import { bearer, connect, refresh, type Tokens } from "../support/oauth.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const start = async () => {
  const ada = await signUp(env, "Ada");
  const tenant = (await env.identity.port.require(ada.browser.headers())).tenant;
  return { ada, tenant, ...(await connect(ada.browser, env.base, env.config.resource)) };
};

describe("MCP flow", () => {
  it("rule 6: the access token carries audience, issuer, user, org_id and a 15 minute life", async () => {
    const { ada, tenant, meta, tokens } = await start();
    const c = decodeJwt(tokens.access_token);
    expect([c.aud].flat()).toContain(env.config.resource);
    expect(c.iss).toBe(meta.issuer);
    expect(String(c.iss).startsWith(env.base)).toBe(true);
    expect(c.sub).toBe(ada.userId);
    expect(c["org_id"]).toBe(tenant);
    expect(Number(c.exp) - Number(c.iat)).toBe(900);
    expect(tokens.expires_in).toBe(900);
  });

  it("rule 6: a shorter configured lifetime is honoured", async () => {
    await env.close();
    env = await boot({ accessTokenTtlSeconds: 600 });
    const { tokens } = await start();
    const c = decodeJwt(tokens.access_token);
    expect(Number(c.exp) - Number(c.iat)).toBe(600);
  });

  it("rule 6: the token calls the resource as an MCP caller in the consented organization", async () => {
    const { ada, tenant, tokens } = await start();
    const res = await fetch(`${env.base}/mcp`, { method: "POST", headers: bearer(tokens.access_token) });
    expect(res.status).toBe(200);
    expect(await json(res)).toMatchObject({ user: ada.userId, tenant, kind: "mcp", scopes: expect.arrayContaining(["offline_access"]) });
  });

  it("rule 6: refresh rotates, and the old refresh token is rejected with invalid_grant", async () => {
    const { meta, client, tokens } = await start();
    const res = await refresh(meta, client, tokens.refresh_token, env.config.resource);
    expect(res.status).toBe(200);
    const next = await json<Tokens>(res);
    expect(next.refresh_token).not.toBe(tokens.refresh_token);
    const reuse = await refresh(meta, client, tokens.refresh_token, env.config.resource);
    expect(reuse.status).toBe(400);
    expect(await json(reuse)).toMatchObject({ error: "invalid_grant" });
  });

  it("rule 6: refresh tokens live 30 days", async () => {
    const { client } = await start();
    const row = one(env.db, 'select expiresAt from "oauthRefreshToken" where clientId = ? order by createdAt desc', client);
    expect(Math.abs(toMs(row["expiresAt"]) - (Date.now() + 30 * DAY))).toBeLessThan(60_000);
  });
});
