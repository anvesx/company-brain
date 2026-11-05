import { decodeJwt } from "jose";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { one } from "../../support/db.js";
import { failure, signUp } from "../../support/http.js";
import { bearer } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";
import { login, MIN } from "../bearer/helpers.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const ask = (headers: HeadersInit) => env.identity.port.fromBearer(new Headers(headers));
const mcp = (headers: HeadersInit) => fetch(`${env.base}/mcp`, { headers });

describe("identity port: messages and header shape", () => {
  it("rule 8: a header that is not 'Bearer <token>' is refused with that message", async () => {
    for (const header of ["Basic abc", "Bearer", "Bearer a b", "xBearer a", "Bearer  a"]) {
      const error = await failure(ask({ authorization: header }));
      expect([header, error.code, error.message]).toEqual([header, "UNAUTHENTICATED", "the authorization header is not a bearer token"]);
    }
  });

  it("rule 8: the scheme is case-insensitive", async () => {
    const error = await failure(ask({ authorization: "bEaReR not.a.jwt" }));
    expect(error.message).toBe("access token is not valid");
  });

  it("rule 3: an MCP caller carries user, tenant, kind and the granted scopes split on single spaces", async () => {
    const { tokens } = await login(env, "Ada");
    const caller = await env.identity.port.fromBearer(new Headers(bearer(tokens.access_token)));
    expect(caller?.kind).toBe("mcp");
    expect(caller?.scopes).toEqual(String(decodeJwt(tokens.access_token)["scope"]).split(" ").filter(Boolean));
    expect(caller?.scopes.length).toBeGreaterThan(0);
  });

  it("rule 3: require with no credential says sign in first", async () => {
    expect((await failure(env.identity.port.require(new Headers()))).message).toBe("sign in first");
  });

  it("rule 3: a session whose active organization was left falls back to the oldest membership", async () => {
    const ada = await signUp(env, "Ada");
    const first = await env.identity.port.fromSession(ada.browser.headers());
    const org = await ada.browser.call("/api/auth/organization/create", { json: { name: "Second", slug: "second" } });
    expect(org.status).toBe(200);
    const second = (await org.json()) as { id: string };
    await ada.browser.call("/api/auth/organization/set-active", { json: { organizationId: second.id } });
    expect((await env.identity.port.fromSession(ada.browser.headers()))?.tenant).toBe(second.id);
    env.db.prepare(`delete from member where organizationId = ? and userId = ?`).run(second.id, ada.userId);
    expect((await env.identity.port.fromSession(ada.browser.headers()))?.tenant).toBe(first?.tenant);
  });

  it("rule 3: a member row that is missing for every organization is NO_ORGANIZATION", async () => {
    const ada = await signUp(env, "Ada");
    env.db.prepare(`delete from member where userId = ?`).run(ada.userId);
    const error = await failure(env.identity.port.fromSession(ada.browser.headers()));
    expect([error.code, error.message]).toEqual(["NO_ORGANIZATION", "the session has no active organization"]);
    expect(one(env.db, `select count(*) as n from member`)["n"]).toBe(0);
  });
});

describe("protect: the 401 answer", () => {
  it("rule 8: a missing credential is 401 with code and a challenge pointing at the resource metadata", async () => {
    const res = await mcp({});
    expect([res.status, await res.json()]).toEqual([401, { error: "unauthorized", code: "UNAUTHENTICATED" }]);
    expect(res.headers.get("www-authenticate")).toBe(`Bearer resource_metadata="${env.base}/.well-known/oauth-protected-resource/mcp"`);
  });

  it("rule 8: a valid token reaches the handler, which echoes the caller", async () => {
    const { tokens } = await login(env, "Ada");
    const res = await mcp(bearer(tokens.access_token));
    expect(((await res.json()) as { kind: string }).kind).toBe("mcp");
    env.clock.advance(MIN);
  });
});
