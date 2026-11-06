import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { count } from "../../support/db.js";
import { Browser, signUp } from "../../support/http.js";
import { follow, googleConfig } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
beforeEach(async () => {
  replay = await startReplay({ oidc: true });
  env = await boot(googleConfig(replay));
});
afterEach(async () => Promise.all([env.close(), replay.close()]));

const continueWithGoogle = async () => {
  const browser = new Browser(env.base);
  return { browser, ...(await follow(browser, await browser.call("/sign-in/google", { form: {} }))) };
};
const accounts = (userId: string) => count(env.db, "select count(*) as n from account where userId = ?", userId);

describe("Google login and existing users (google-login rule 4)", () => {
  it("rule 4: a password user whose email is verified is linked to Google, not duplicated", async () => {
    const ada = await signUp(env, "Ada", "ada@provider.example");
    // No email verification flow exists yet, so the test marks the address verified directly.
    env.db.prepare("update user set emailVerified = 1 where id = ?").run(ada.userId);
    const { at } = await continueWithGoogle();
    expect(at.pathname).toBe("/connections");
    expect(count(env.db, "select count(*) as n from user")).toBe(1);
    expect(count(env.db, "select count(*) as n from account where userId = ? and providerId = 'google'", ada.userId)).toBe(1);
    expect(accounts(ada.userId)).toBe(2);
  });

  it("rule 4: a password user whose email is not verified is not taken over through Google", async () => {
    const ada = await signUp(env, "Ada", "ada@provider.example");
    const { at, browser } = await continueWithGoogle();
    expect(at.pathname).toBe("/sign-in");
    expect([count(env.db, "select count(*) as n from user"), accounts(ada.userId)]).toEqual([1, 1]);
    expect([...browser.jar.keys()].some((name) => name.includes("session_token"))).toBe(false);
  });
});
