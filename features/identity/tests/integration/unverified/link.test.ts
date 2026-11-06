import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { count } from "../../support/db.js";
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

describe("linking a connector does not depend on the provider's email_verified flag", () => {
  it("a signed-in person links a connector whose email is unverified and not theirs: the account row is stored", async () => {
    const ada = await signUp(env, "Ada", "ada@example.com");
    // The link belongs to the signed-in session, not to an email, so the provider's verdict on its own email does not matter.
    replay.state.user = { ...replay.state.user, sub: "unverified-1", email: "someone@provider.example", email_verified: false };
    const { id, at } = await linkReplay(env, ada);
    expect(at.pathname).toBe("/connections");
    expect(at.searchParams.get("error")).toBeNull();
    expect(count(env.db, "select count(*) as n from account where userId = ? and providerId = 'replay' and id = ?", ada.userId, id)).toBe(1);
  });
});
