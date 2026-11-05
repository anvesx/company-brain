import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { json, type Person, signUp } from "../../support/http.js";
import { authorize, authParams, clientId, consent, discover, LOOPBACK, type Meta, pkce, token } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
let meta: Meta;
let client: string;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
  meta = await discover(env.base);
  client = await clientId(meta);
});
afterEach(() => env.close());

const rejected = (step: { status: number; location: string | null; body: string }, error: string) => {
  const viaRedirect = step.location !== null && new URL(step.location, env.base).searchParams.get("error") === error;
  expect(viaRedirect || (step.status === 400 && step.body.includes(error)), `${step.status} ${step.location} ${step.body}`).toBe(true);
};

describe("authorization request", () => {
  it("rule 6: PKCE plain is rejected", async () => {
    rejected(await authorize(ada.browser, meta, authParams(client, env.config.resource, pkce(), { code_challenge_method: "plain" })), "invalid_request");
  });

  it("rule 6: a request with no code challenge is rejected", async () => {
    const { code_challenge: _drop, ...params } = authParams(client, env.config.resource, pkce());
    rejected(await authorize(ada.browser, meta, params), "invalid_request");
  });

  it("rule 6: a resource other than the brain's MCP URL is invalid_target", async () => {
    rejected(await authorize(ada.browser, meta, authParams(client, `${env.base}/other`, pkce())), "invalid_target");
  });

  it("rule 13: a redirect not matching the registration is BAD_INPUT and never redirects", async () => {
    const step = await authorize(ada.browser, meta, authParams(client, env.config.resource, pkce(), { redirect_uri: "http://127.0.0.1:9999/cb" }));
    expect(step.status).toBe(400);
    expect(step.location).toBeNull();
    expect(JSON.parse(step.body)).toMatchObject({ code: "BAD_INPUT", field: "redirect_uri" });
  });

  it("rule 13: a token request with no code_verifier is BAD_INPUT naming code_verifier", async () => {
    const step = await authorize(ada.browser, meta, authParams(client, env.config.resource, pkce()));
    const code = await consent(ada.browser, String(step.location));
    const res = await token(meta, { grant_type: "authorization_code", code, redirect_uri: LOOPBACK, client_id: client, resource: env.config.resource });
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ error: "invalid_request", code: "BAD_INPUT", field: "code_verifier" });
  });

  it("rule 6: a wrong code_verifier is invalid_grant", async () => {
    const step = await authorize(ada.browser, meta, authParams(client, env.config.resource, pkce()));
    const code = await consent(ada.browser, String(step.location));
    const form = { grant_type: "authorization_code", code, redirect_uri: LOOPBACK, client_id: client, code_verifier: pkce().verifier };
    const res = await token(meta, { ...form, resource: env.config.resource });
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ error: "invalid_grant" });
  });
});
