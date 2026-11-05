import { describe, expect, it } from "vitest";
import { MINUTE } from "../../support/db.js";
import { Browser, PASSWORD, signIn, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

const failFive = async (env: Env, email: string) => {
  for (let i = 0; i < 5; i++) expect((await signIn(new Browser(env.base), email, "wrong-password-123")).status).toBe(401);
};

const retryAfter = (res: Response): number => Number(res.headers.get("retry-after"));

describe("sign-in lockout", () => {
  it("rule 2: the sixth sign-in after five failures is 429 with Retry-After, even with the right password", async () => {
    const env = await boot();
    const ada = await signUp(env, "Ada");
    await failFive(env, ada.email);
    const res = await signIn(new Browser(env.base), ada.email, PASSWORD);
    expect(res.status).toBe(429);
    expect(retryAfter(res)).toBeGreaterThanOrEqual(1);
    expect(retryAfter(res)).toBeLessThanOrEqual(900);
    await env.close();
  });

  it("rule 2: after 15 minutes the right password signs in again", async () => {
    const env = await boot();
    const ada = await signUp(env, "Ada");
    await failFive(env, ada.email);
    env.clock.advance(15 * MINUTE + 1000);
    expect((await signIn(new Browser(env.base), ada.email, PASSWORD)).status).toBe(200);
    await env.close();
  });

  it("rule 2: the lock is per email; another account still signs in", async () => {
    const env = await boot();
    const [ada, bob] = [await signUp(env, "Ada"), await signUp(env, "Bob")];
    await failFive(env, ada.email);
    expect((await signIn(new Browser(env.base), bob.email, PASSWORD)).status).toBe(200);
    await env.close();
  });

  it("rule 2: the counter lives in the database and survives a restart", async () => {
    const first = await boot();
    const ada = await signUp(first, "Ada");
    await failFive(first, ada.email);
    await first.close();
    const second = await boot({}, first.path);
    expect((await signIn(new Browser(second.base), ada.email, PASSWORD)).status).toBe(429);
    await second.close();
  });

  it("rule 2: four failures do not lock", async () => {
    const env = await boot();
    const ada = await signUp(env, "Ada");
    for (let i = 0; i < 4; i++) await signIn(new Browser(env.base), ada.email, "wrong-password-123");
    expect((await signIn(new Browser(env.base), ada.email, PASSWORD)).status).toBe(200);
    await env.close();
  });
});
