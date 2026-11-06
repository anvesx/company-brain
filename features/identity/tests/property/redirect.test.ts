import fc from "fast-check";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Person, signUp } from "../support/http.js";
import { authorize, authParams, clientId, discover, LOOPBACK, type Meta, pkce } from "../support/oauth.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
let ada: Person;
let meta: Meta;
let client: string;
beforeAll(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
  meta = await discover(env.base);
  client = await clientId(meta, LOOPBACK);
});
afterAll(() => env.close());

const near = fc.oneof(
  fc.integer({ min: 1, max: 65535 }).map((port) => `http://127.0.0.1:${port}/cb`),
  fc.webPath().map((path) => `http://127.0.0.1:8765${path}`),
  fc.webQueryParameters().map((q) => `${LOOPBACK}?${q}`),
  fc.constantFrom(`${LOOPBACK}/`, "http://localhost:8765/cb", "https://127.0.0.1:8765/cb", "HTTP://127.0.0.1:8765/CB", `${LOOPBACK}#x`),
  fc.webUrl(),
);

describe("redirect property", () => {
  it("rule 13: any redirect not equal to the registered one is 400 and never redirects", async () => {
    await fc.assert(
      fc.asyncProperty(
        near.filter((r) => r !== LOOPBACK),
        async (redirect) => {
          const step = await authorize(ada.browser, meta, authParams(client, env.config.resource, pkce(), { redirect_uri: redirect }));
          expect(step.status, redirect).toBe(400);
          expect(step.location, redirect).toBeNull();
        },
      ),
      { numRuns: 40 },
    );
  });

  it("rule 13: the registered redirect itself is accepted (the property is not vacuous)", async () => {
    const step = await authorize(ada.browser, meta, authParams(client, env.config.resource, pkce()));
    expect(step.status).toBe(302);
  });
});
