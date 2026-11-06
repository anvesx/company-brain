import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createIdentity } from "../../src/index.js";
import { MINUTE } from "../support/db.js";
import { failure, signUp } from "../support/http.js";
import { bearer, connect } from "../support/oauth.js";
import { boot, type Env, pastExpiry } from "../support/server.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const tokenFor = async (on: Env) => {
  const ada = await signUp(on, "Ada");
  return (await connect(ada.browser, on.base, on.config.resource)).tokens.access_token;
};
const callMcp = (on: Env, token: string) => fetch(`${on.base}/mcp`, { method: "POST", headers: bearer(token) });
const expectChallenge = (res: Response) => {
  expect(res.status).toBe(401);
  expect(res.headers.get("www-authenticate")).toMatch(/^Bearer\b.*resource_metadata="/);
};

describe("MCP route guard", () => {
  it("rule 8: a token past its 15 minutes is EXPIRED and the route answers 401 with the challenge", async () => {
    const token = await tokenFor(env);
    pastExpiry(env.clock, token);
    expect((await failure(env.identity.port.fromBearer(new Headers(bearer(token))))).code).toBe("EXPIRED");
    expectChallenge(await callMcp(env, token));
  });

  it("rule 8: a token one minute before expiry still passes", async () => {
    const token = await tokenFor(env);
    env.clock.advance(14 * MINUTE);
    expect((await callMcp(env, token)).status).toBe(200);
  });

  it("rule 8: a token for another resource is WRONG_AUDIENCE", async () => {
    const token = await tokenFor(env);
    const other = createIdentity({ ...env.config, resource: `${env.base}/other` });
    expect((await failure(other.port.fromBearer(new Headers(bearer(token))))).code).toBe("WRONG_AUDIENCE");
  });

  it("rule 8: a forged signature is UNAUTHENTICATED and 401", async () => {
    const token = await tokenFor(env);
    const [head, body, sig] = token.split(".");
    const forged = `${head}.${body}.${String(sig).startsWith("A") ? "B" : "A"}${String(sig).slice(1)}`;
    expect((await failure(env.identity.port.fromBearer(new Headers(bearer(forged))))).code).toBe("UNAUTHENTICATED");
    expectChallenge(await callMcp(env, forged));
  });

  it("rule 8: a token signed by another deployment's keys is 401", async () => {
    const elsewhere = await boot();
    const token = await tokenFor(elsewhere);
    expectChallenge(await callMcp(env, token));
    await elsewhere.close();
  });

  it("rule 8: no failure is ever 403", async () => {
    const token = await tokenFor(env);
    for (const bad of ["", "x", `${token}x`, token.split(".").slice(0, 2).join(".")]) {
      expect((await callMcp(env, bad)).status, bad).toBe(401);
    }
    expect((await fetch(`${env.base}/mcp`, { headers: { authorization: "Basic YTpi" } })).status).toBe(401);
  });
});
