import { afterEach, describe, expect, it } from "vitest";
import { count, rows } from "../../support/db.js";
import { Browser, signUp } from "../../support/http.js";
import { connectorConfig, googleConfig } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
// NODE_ENV is set directly (and restored) because better-auth reads it from process.env at boot.
const nodeEnv = process.env["NODE_ENV"];
afterEach(async () => {
  process.env["NODE_ENV"] = nodeEnv;
  await Promise.all([env.close(), replay.close()]);
});

/** Starts a Google sign-in, then spends that state on the connector's authorize and callback: one provider's state, another's callback. */
async function confuse(browser: Browser) {
  const start = await browser.call("/sign-in/google", { form: {} });
  const google = new URL(start.headers.get("location") ?? "");
  const authorize = new URL(`${replay.base}/authorize`);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", replay.state.clientId);
  authorize.searchParams.set("redirect_uri", `${env.base}/api/auth/callback/replay`);
  for (const key of ["state", "code_challenge", "code_challenge_method", "scope", "nonce"]) {
    const value = google.searchParams.get(key);
    if (value) authorize.searchParams.set(key, value);
  }
  const back = new URL((await fetch(authorize, { redirect: "manual" })).headers.get("location") ?? "");
  const res = await browser.call(back.pathname + back.search);
  return { res, session: [...browser.jar.keys()].some((name) => name.includes("session_token")) };
}

describe.each(["test", "production"])("a Google state spent on a connector callback (google-login rule 4), NODE_ENV=%s", (mode) => {
  const begin = async () => {
    process.env["NODE_ENV"] = mode;
    replay = await startReplay({ oidc: true });
    env = await boot({ ...connectorConfig(replay), ...googleConfig(replay) });
  };

  it("makes no user, no account and no session when nobody exists yet", async () => {
    await begin();
    const { res, session } = await confuse(new Browser(env.base));
    expect(res.headers.get("location")).toContain("connector_not_a_door");
    expect([session, count(env.db, "select count(*) as n from user"), count(env.db, "select count(*) as n from account")]).toEqual([false, 0, 0]);
  });

  it("does not link the connector to a verified user with the same email, and the caller is not that user", async () => {
    await begin();
    const victim = await signUp(env, "Victim", "ada@provider.example");
    env.db.prepare("update user set emailVerified = 1 where id = ?").run(victim.userId);
    const attacker = new Browser(env.base);
    const { session } = await confuse(attacker);
    expect(session).toBe(false);
    expect(rows(env.db, "select providerId from account").map((row) => row["providerId"])).toEqual(["credential"]);
    expect(await (await attacker.call("/api/auth/get-session")).text()).not.toContain(victim.userId);
  });
});
