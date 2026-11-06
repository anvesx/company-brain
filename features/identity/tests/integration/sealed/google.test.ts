import { afterEach, describe, expect, it } from "vitest";
import { one } from "../../support/db.js";
import { Browser } from "../../support/http.js";
import { follow, googleConfig, newSealKey } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
afterEach(async () => Promise.all([env?.close(), replay?.close()]));

describe("Google tokens are sealed at rest (connector-accounts rule 1, google-login rule 4)", () => {
  it("createIdentity refuses a Google config that has no seal key, and names sealKey", async () => {
    replay = await startReplay({ oidc: true });
    const { sealKey: _none, ...noKey } = googleConfig(replay);
    await expect(boot(noKey)).rejects.toMatchObject({ code: "BAD_INPUT", field: "sealKey" });
  });

  it("with a key, a Google sign-in stores no plaintext access, refresh or id token", async () => {
    replay = await startReplay({ oidc: true });
    env = await boot(googleConfig(replay, newSealKey()));
    const browser = new Browser(env.base);
    await follow(browser, await browser.call("/sign-in/google", { form: {} }));
    const row = one(env.db, "select accessToken, refreshToken, idToken from account where providerId = 'google'");
    expect(row["accessToken"]).toBeTruthy();
    expect(row["idToken"]).toBeTruthy();
    for (const column of ["accessToken", "refreshToken", "idToken"]) {
      const value = String(row[column] ?? "");
      expect(value, column).not.toMatch(/^(at_|rt_|eyJ)/);
      expect(value, column).not.toContain("eyJ");
    }
  });
});
