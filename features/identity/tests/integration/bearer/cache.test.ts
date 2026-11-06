import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { failure } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";
import { verify as check, fetches, login, MIN } from "./helpers.js";

let env: Env;
beforeEach(async () => {
  env = await boot();
});
afterEach(() => env.close());

const verify = (token: string) => check(env, token);
const count = () => fetches(env);

describe("key set caching", () => {
  it("rule 8: overlapping first checks share one key set fetch", async () => {
    const [a, b] = [await login(env, "Ada"), await login(env, "Bob")];
    const before = count();
    await Promise.all([verify(a.tokens.access_token), verify(b.tokens.access_token), verify(a.tokens.access_token)]);
    expect(count() - before).toBe(1);
  });

  it("rule 8: inside the hour the key set is reused; at exactly one hour it is fetched again", async () => {
    await verify((await login(env, "Ada")).tokens.access_token);
    const first = count();
    // A malformed token fails after the key set is chosen, so the fetch count shows whether the cache was used.
    // One millisecond short of an hour after the fetch: still cached.
    env.clock.advance(60 * MIN - 1);
    await failure(verify("not.a.jwt"));
    expect(count()).toBe(first);
    // Exactly 3,600,000 ms after the fetch: stale, so one new fetch.
    env.clock.advance(1);
    await failure(verify("not.a.jwt"));
    expect(count()).toBe(first + 1);
  });
});
