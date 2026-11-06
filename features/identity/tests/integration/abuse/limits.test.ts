import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Browser, PASSWORD, signIn, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let email: string;
beforeEach(async () => {
  env = await boot();
  email = (await signUp(env, "Ada")).email;
  for (let i = 0; i < 5; i++) await signIn(new Browser(env.base), email, "wrong-password-123");
});
afterEach(() => env.close());

const wait = async () => {
  const res = await signIn(new Browser(env.base), email, PASSWORD);
  return res.status === 429 ? res.headers.get("retry-after") : `signed in ${res.status}`;
};

describe("sign-in lockout, exact Retry-After", () => {
  it("rule 2: right after the fifth failure the wait is the whole window, 15 x 60 = 900 s", async () => {
    expect(await wait()).toBe("900");
  });

  it("rule 2: the wait rounds up: 900 000 - 100 500 = 799 500 ms is 800 s", async () => {
    env.clock.advance(100_500);
    expect(await wait()).toBe("800");
  });

  it("rule 2: one millisecond before the oldest failure leaves the window the wait is 1 s", async () => {
    env.clock.advance(899_999);
    expect(await wait()).toBe("1");
  });

  it("rule 2: at exactly 900 000 ms the oldest failure no longer counts and sign-in works", async () => {
    env.clock.advance(900_000);
    expect(await wait()).toBe("signed in 200");
  });
});
