import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE, one } from "../../support/db.js";
import { signUp } from "../../support/http.js";
import { connectorConfig, seedAccounts } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay, id] = [undefined as unknown as Env, undefined as unknown as Replay, ""];
beforeEach(async () => {
  replay = await startReplay();
  env = await boot(connectorConfig(replay));
  id = (await seedAccounts(env, replay, (await signUp(env, "Ada")).userId, 1, MINUTE))[0] ?? "";
});
// One test closes the database itself, so the harness closing it again must not fail the test.
afterEach(async () => Promise.all([env.close().catch(() => undefined), replay.close()]));
const code = (work: Promise<unknown>) =>
  work.then(
    () => "ok",
    (error: { code?: string }) => error.code,
  );

// Token and status writes fail; the lease writes (other columns) still work, so the failure lands after the provider was asked.
const NO_TOKEN_WRITES = "create trigger no_writes before update of accessToken, status on account begin select raise(abort, 'disk full'); end";

describe("a database failure is its own error, never PROVIDER_DOWN (connector-accounts rule 4)", () => {
  it("with the database closed, refreshAccount fails with STORE_FAILED", async () => {
    env.db.close();
    expect(await code(env.identity.refreshAccount(id))).toBe("STORE_FAILED");
  });

  it("when the provider answers but the write fails, STORE_FAILED comes back and the provider was asked once", async () => {
    env.db.exec(NO_TOKEN_WRITES);
    expect(await code(env.identity.refreshAccount(id))).toBe("STORE_FAILED");
    expect(replay.state.calls.refresh).toBe(1);
    expect(one(env.db, "select status from account where id = ?", id)["status"]).toBe("active");
  });

  it("when the provider refuses and the status write fails, STORE_FAILED comes back, not NEEDS_AUTH", async () => {
    replay.state.mode = "invalid_grant";
    env.db.exec(NO_TOKEN_WRITES);
    expect(await code(env.identity.refreshAccount(id))).toBe("STORE_FAILED");
  });
});
