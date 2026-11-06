import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

describe("pages that need no session", () => {
  it("rule 12: GET /sign-in?x=1 renders the query into the form", async () => {
    const body = await (await new Browser(env.base).call("/sign-in?x=1")).text();
    expect(body).toContain('name="oauth_query" value="x=1"');
  });

  it("rule 12: GET /sign-in with no query carries an empty oauth_query", async () => {
    expect(await (await new Browser(env.base).call("/sign-in")).text()).toContain('name="oauth_query" value=""');
  });

  it("rule 12: GET /sign-up?x=1 renders the query too", async () => {
    expect(await (await new Browser(env.base).call("/sign-up?x=1")).text()).toContain('name="oauth_query" value="x=1"');
  });

  it("rule 11: / is 302 to /connections", async () => {
    const res = await new Browser(env.base).call("/");
    expect([res.status, res.headers.get("location")]).toEqual([302, "/connections"]);
  });

  it("rule 12: a signed-out visit to /connections goes to /sign-in and keeps the query", async () => {
    const res = await new Browser(env.base).call("/connections?a=b");
    expect([res.status, res.headers.get("location")]).toEqual([302, "/sign-in?a=b"]);
  });

  it("rule 12: a signed-out visit with no query goes to a bare /sign-in", async () => {
    expect((await new Browser(env.base).call("/connections")).headers.get("location")).toBe("/sign-in");
  });
});
