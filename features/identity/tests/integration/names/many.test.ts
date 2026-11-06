import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { signUp } from "../../support/http.js";
import { connectorConfig, seedAccounts } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
beforeEach(async () => {
  replay = await startReplay();
  env = await boot(connectorConfig(replay));
});
afterEach(async () => Promise.all([env.close(), replay.close()]));

describe("identity.names with more accounts than the adapter's default page", () => {
  it("returns every one of 150 linked account ids", async () => {
    const bob = await signUp(env, "Bob");
    const ids = await seedAccounts(env, replay, bob.userId, 150, null);
    expect([...(await env.identity.names(bob.userId)).accountIds].sort()).toEqual([...ids].sort());
  });
});
