import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE, one } from "../../support/db.js";
import { signUp } from "../../support/http.js";
import { refreshInProcesses } from "../../support/process/spawn.js";
import { connectorConfig, seedAccounts } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
const cfg = () => connectorConfig(replay);
afterEach(async () => Promise.all([env.close(), replay.close()]));

describe("two processes call refreshAccount on one unleased due row while the provider rotates refresh tokens", () => {
  beforeEach(async () => {
    replay = await startReplay();
    // The provider takes half a second to answer, so both processes are inside their call together.
    replay.state.delayMs = 500;
    env = await boot(cfg());
  });

  it("one of them asks the provider, the other gets LEASED, and the row ends active", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    const printed = await refreshInProcesses(env, replay, env.config, id);
    expect(printed.sort()).toEqual(["LEASED", "refreshed"]);
    expect(replay.state.calls.refresh).toBe(1);
    expect(one(env.db, "select status from account where id = ?", id)["status"]).toBe("active");
    // The winner's new token works: the person can still read it.
    replay.state.delayMs = 0;
    expect((await env.identity.port.accessToken(ada.userId, "replay", id)).startsWith("at_")).toBe(true);
  }, 60_000);
});
