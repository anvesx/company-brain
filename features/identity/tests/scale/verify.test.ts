import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MINUTE } from "../support/db.js";
import { signUp } from "../support/http.js";
import { bearer, connect } from "../support/oauth.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
let token: string;
let jwksPath: string;
beforeAll(async () => {
  env = await boot();
  const ada = await signUp(env, "Ada");
  const done = await connect(ada.browser, env.base, env.config.resource);
  [token, jwksPath] = [done.tokens.access_token, new URL(done.meta.jwks_uri).pathname];
});
afterAll(() => env.close());

const fetches = () => env.hits.get(jwksPath) ?? 0;
const verify = (t: string) => env.identity.port.fromBearer(new Headers(bearer(t))).catch((error: unknown) => error);

describe("verification at scale", () => {
  it("rule 15: 10,000 verifications run under 1 s from the cached key set", async () => {
    await verify(token);
    const before = fetches();
    const started = performance.now();
    for (let i = 0; i < 10_000; i++) await env.identity.port.fromBearer(new Headers(bearer(token)));
    const ms = performance.now() - started;
    console.log(`rule 15: 10000 verifications in ${ms.toFixed(0)} ms (${((ms / 10_000) * 1000).toFixed(1)} us each), key set fetches ${fetches() - before}`);
    expect(fetches() - before).toBe(0);
    expect(ms).toBeLessThan(1000);
  });

  it("rule 15: an unknown key id refetches the key set once the one-minute cooldown has passed", async () => {
    await verify(token);
    const [head, body, sig] = token.split(".");
    const header = { ...JSON.parse(Buffer.from(String(head), "base64url").toString()), kid: "unknown-key-id" };
    const forged = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${body}.${sig}`;
    const before = fetches();
    await verify(forged); // inside the cooldown: no fetch
    expect(fetches() - before).toBe(0);
    env.clock.advance(2 * MINUTE);
    await verify(forged); // cooldown over: exactly one fetch
    expect(fetches() - before).toBe(1);
  });

  it("rule 15: the key set is refetched after an hour", async () => {
    await verify(token);
    const before = fetches();
    env.clock.advance(61 * MINUTE);
    await verify(token);
    expect(fetches() - before).toBeGreaterThanOrEqual(1);
  });
});
