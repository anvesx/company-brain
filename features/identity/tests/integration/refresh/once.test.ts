import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE, one } from "../../support/db.js";
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

describe("the provider is asked once, and never for a row that needs the person", () => {
  it("two refreshAccount calls at once make exactly one provider call", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    await Promise.all([env.identity.refreshAccount(id), env.identity.refreshAccount(id)]);
    expect(replay.state.calls.refresh).toBe(1);
  });

  it("a needs-auth row answers NEEDS_AUTH from its stored state and the provider is not asked again", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    replay.state.mode = "invalid_grant";
    await expect(env.identity.port.accessToken(ada.userId, "replay", id)).rejects.toMatchObject({ code: "NEEDS_AUTH" });
    expect(one(env.db, "select status from account where id = ?", id)["status"]).toBe("needs-auth");
    const asked = replay.state.calls.refresh;
    replay.state.mode = "ok";
    await expect(env.identity.port.accessToken(ada.userId, "replay", id)).rejects.toMatchObject({ code: "NEEDS_AUTH" });
    expect(replay.state.calls.refresh).toBe(asked);
  });

  it("refreshAccount on a needs-auth row answers NEEDS_AUTH and does not call the provider or flip the row back to active", async () => {
    const ada = await signUp(env, "Ada");
    const [id = ""] = await seedAccounts(env, replay, ada.userId, 1, MINUTE);
    env.db.prepare("update account set status = 'needs-auth' where id = ?").run(id);
    await expect(env.identity.refreshAccount(id)).rejects.toMatchObject({ code: "NEEDS_AUTH" });
    expect(replay.state.calls.refresh).toBe(0);
    expect(one(env.db, "select status from account where id = ?", id)["status"]).toBe("needs-auth");
  });
});
