import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE } from "../support/db.js";
import { signUp } from "../support/http.js";
import { bearer, connect } from "../support/oauth.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
let token: string;
let jwksPath: string;
beforeEach(async () => {
  env = await boot();
  const done = await connect((await signUp(env, "Ada")).browser, env.base, env.config.resource);
  [token, jwksPath] = [done.tokens.access_token, new URL(done.meta.jwks_uri).pathname];
  await env.identity.port.fromBearer(new Headers(bearer(token))); // loads the key set once
});
afterEach(() => env.close());

const fetches = () => env.hits.get(jwksPath) ?? 0;
/** The real token with its key id swapped: a signature check can never pass, but the key lookup runs first. */
const withKid = (kid: string): string => {
  const [head, body, sig] = token.split(".");
  const header = { ...JSON.parse(Buffer.from(String(head), "base64url").toString()), kid };
  return `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${body}.${sig}`;
};
const verify = (t: string) => env.identity.port.fromBearer(new Headers(bearer(t))).catch((error: unknown) => error);

describe("forged key ids cannot make the service hammer its key set", () => {
  it("rule 15: 1000 unknown key ids in a row cause at most 2 fetches", async () => {
    // Hand count: the key set loaded in beforeEach is under a minute old, so every id is inside the
    // cooldown and costs 0 fetches. After 2 minutes the first id costs 1, and the other 999 are cooling again.
    const before = fetches();
    for (let i = 0; i < 500; i++) await verify(withKid(`a${i}`));
    env.clock.advance(2 * MINUTE);
    for (let i = 0; i < 500; i++) await verify(withKid(`b${i}`));
    expect(fetches() - before).toBeLessThanOrEqual(2);
    expect(fetches() - before).toBe(1);
  });

  it("rule 15: 200 concurrent unknown key ids share one fetch", async () => {
    // After 2 minutes the cooldown is over, so all 200 want a refetch; they join the one request in flight.
    env.clock.advance(2 * MINUTE);
    const before = fetches();
    await Promise.all(Array.from({ length: 200 }, (_, i) => verify(withKid(`c${i}`))));
    expect(fetches() - before).toBe(1);
  });

  it("rule 15: 50 unauthenticated calls to /mcp cost 0 fetches and leave the proven token valid", async () => {
    const before = fetches();
    for (let i = 0; i < 50; i++) {
      const res = await fetch(`${env.base}/mcp`, { headers: bearer(withKid(`h${i}`)) });
      expect(res.status).toBe(401);
    }
    expect((await fetch(`${env.base}/mcp`, { headers: bearer(token) })).status).toBe(200);
    expect(fetches() - before).toBe(0);
  });
});
