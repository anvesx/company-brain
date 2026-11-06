import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signUp } from "../../support/http.js";
import { connectorConfig, linkReplay } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
beforeEach(async () => {
  replay = await startReplay();
  env = await boot(connectorConfig(replay));
});
afterEach(async () => Promise.all([env.close(), replay.close()]));

describe("identity.names reads the user and account rows for an app", () => {
  it("returns the email, emailVerified false, and only the linked account id", async () => {
    const ada = await signUp(env, "Ada");
    const { id } = await linkReplay(env, ada);
    const names = await env.identity.names(ada.userId);
    expect(names.email).toMatch(/@/);
    // Identity does not verify emails yet (an open item in src/consent/README.md).
    expect(names.emailVerified).toBe(false);
    expect(names.accountIds).toEqual([id]);
  });

  it("an unknown user has no email and no accounts", async () => {
    expect(await env.identity.names("no-such-user")).toEqual({ email: "", emailVerified: false, accountIds: [] });
  });
});
