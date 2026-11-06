import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { count, one } from "../../support/db.js";
import { Browser } from "../../support/http.js";
import { follow, googleConfig } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
beforeEach(async () => {
  replay = await startReplay({ oidc: true });
  env = await boot(googleConfig(replay));
});
afterEach(async () => Promise.all([env.close(), replay.close()]));

/** One "Continue with Google" click from a browser with no session, followed to wherever it lands. */
const continueWithGoogle = async (browser = new Browser(env.base)) => ({
  browser,
  ...(await follow(browser, await browser.call("/sign-in/google", { form: {} }))),
});
const googleForm = /<form method="post" action="\/sign-in\/google">([\s\S]*?)<\/form>/;

describe("Google login (google-login rules 1 and 3)", () => {
  it("rule 1: sign-in and sign-up both show a Continue with Google form with no csrf field", async () => {
    for (const path of ["/sign-in", "/sign-up"]) {
      const form = googleForm.exec(await (await new Browser(env.base).call(path)).text())?.[1];
      expect(form).toContain("Continue with Google");
      expect(form).not.toContain('name="csrf"');
    }
  });

  it("rule 1: the post answers 302 to the provider with prompt=select_account, our client and our callback", async () => {
    const res = await new Browser(env.base).call("/sign-in/google", { form: {} });
    expect(res.status).toBe(302);
    const to = new URL(res.headers.get("location") ?? "");
    expect(to.origin + to.pathname).toBe(`${replay.base}/authorize`);
    expect(to.searchParams.get("prompt")).toBe("select_account");
    expect(to.searchParams.get("client_id")).toBe("replay-client");
    expect(to.searchParams.get("redirect_uri")).toBe(`${env.base}/api/auth/callback/google`);
    expect(to.searchParams.get("scope")?.split(" ")).toEqual(expect.arrayContaining(["openid", "email"]));
  });

  it("rule 3: a first-time Google user lands on /connections, signed in, with one organization", async () => {
    const { browser, at, res } = await continueWithGoogle();
    expect([at.pathname, res.status]).toEqual(["/connections", 200]);
    const user = one(env.db, "select id, name, emailVerified from user where email = ?", "ada@provider.example");
    expect(count(env.db, "select count(*) as n from member where userId = ?", String(user["id"]))).toBe(1);
    const org = one(env.db, "select o.name from organization o join member m on m.organizationId = o.id where m.userId = ?", String(user["id"]));
    expect(org["name"]).toBe("Ada Provider");
    expect((await browser.call("/connections")).status).toBe(200);
  });

  it("rule 3: a returning Google user signs in to the same user, account and organization", async () => {
    await continueWithGoogle();
    const first = one(env.db, "select id from user where email = ?", "ada@provider.example")["id"];
    const { at } = await continueWithGoogle();
    expect(at.pathname).toBe("/connections");
    expect(one(env.db, "select id from user where email = ?", "ada@provider.example")["id"]).toBe(first);
    expect(count(env.db, "select count(*) as n from user")).toBe(1);
    expect(count(env.db, "select count(*) as n from account where providerId = 'google'")).toBe(1);
    expect(count(env.db, "select count(*) as n from member")).toBe(1);
  });
});
