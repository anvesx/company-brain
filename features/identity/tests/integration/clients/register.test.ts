import { Hono } from "hono";
import { afterEach, describe, expect, it } from "vitest";
import { addressOf } from "../../../src/routes/validate.js";
import { json, signUp } from "../../support/http.js";
import { authorize, authParams, discover, LOOPBACK, pkce, register } from "../../support/oauth.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
afterEach(() => env.close());
const HOUR = 3600_000;

describe("client registration", () => {
  it("rule 5: a native client registers a loopback redirect with no credentials", async () => {
    env = await boot();
    const res = await register(await discover(env.base), LOOPBACK);
    expect(res.ok).toBe(true);
    expect(await json(res)).toMatchObject({ client_id: expect.any(String), redirect_uris: [LOOPBACK] });
  });

  it("rule 5: a web client must use https; http is invalid_redirect_uri", async () => {
    env = await boot();
    const meta = await discover(env.base);
    const res = await register(meta, "http://app.example.com/cb");
    expect(res.status).toBe(400);
    expect(await json(res)).toMatchObject({ error: "invalid_redirect_uri" });
    expect((await register(meta, "https://app.example.com/cb")).ok).toBe(true);
  });

  it("rule 5: behind a trusted proxy, registration is limited to 20 per hour per forwarded address, then 429 with Retry-After", async () => {
    env = await boot({ trustProxy: true });
    const meta = await discover(env.base);
    for (let i = 0; i < 20; i++) expect((await register(meta, LOOPBACK, "203.0.113.7")).ok, `call ${i + 1}`).toBe(true);
    const blocked = await register(meta, LOOPBACK, "203.0.113.7");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    expect((await register(meta, LOOPBACK, "203.0.113.8")).ok).toBe(true);
    env.clock.advance(HOUR + 1000);
    expect((await register(meta, LOOPBACK, "203.0.113.7")).ok).toBe(true);
  });

  it("rule 5: without trustProxy a rotating X-Forwarded-For does not dodge the limit: the 21st call is 429", async () => {
    env = await boot();
    const meta = await discover(env.base);
    // Every call claims a new address. The socket address is the same, so calls 1 to 20 pass and call 21 is blocked.
    for (let i = 0; i < 20; i++) expect((await register(meta, LOOPBACK, `203.0.113.${i + 1}`)).ok, `call ${i + 1}`).toBe(true);
    expect((await register(meta, LOOPBACK, "198.51.100.99")).status).toBe(429);
  });

  it("rule 5: with trustProxy the last forwarded hop is the key, so a client-added first hop changes nothing", async () => {
    env = await boot({ trustProxy: true });
    const meta = await discover(env.base);
    // The proxy appended 10.0.0.1 each time; the client invented the first hop. 20 pass, the 21st is blocked.
    for (let i = 0; i < 20; i++) expect((await register(meta, LOOPBACK, `203.0.113.${i + 1}, 10.0.0.1`)).ok, `call ${i + 1}`).toBe(true);
    expect((await register(meta, LOOPBACK, "198.51.100.99, 10.0.0.1")).status).toBe(429);
    expect((await register(meta, LOOPBACK, "198.51.100.99, 10.0.0.2")).ok).toBe(true);
  });

  it("rule 5: with no socket behind the request every caller shares the global key", async () => {
    env = await boot();
    const app = new Hono().get("/", (c) => c.text(addressOf(c, false)));
    // app.request has no Node socket, so there is no address to key on.
    expect(await (await app.request("/", { headers: { "x-forwarded-for": "203.0.113.9" } })).text()).toBe("global");
  });

  it("rule 5: a static client from config can authorize without registering", async () => {
    env = await boot({ clients: [{ id: "static-desktop", name: "Static desktop", redirectUris: [LOOPBACK] }] });
    const ada = await signUp(env, "Ada");
    const step = await authorize(ada.browser, await discover(env.base), authParams("static-desktop", env.config.resource, pkce()));
    expect(step.status).toBe(302);
    expect(new URL(String(step.location), env.base).pathname).toBe("/consent");
  });
});
