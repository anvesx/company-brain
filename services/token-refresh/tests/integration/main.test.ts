import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE, one } from "../../../../features/identity/tests/support/db.js";
import { SECRET } from "../../../../features/identity/tests/support/server.js";
import { type World, world } from "../helpers.js";

const run = promisify(execFile);
let w: World;
beforeEach(async () => {
  w = await world();
});
afterEach(async () => w.close());

/** The process environment the service reads: the same SQLite file, seal key and provider list the test stack booted with. */
const environment = (db: string) => ({
  PATH: process.env["PATH"] ?? "",
  BASE_URL: w.env.base,
  AUTH_SECRET: SECRET,
  SEAL_KEY: String(w.env.config.sealKey),
  DATABASE_PATH: db,
  PROVIDERS: JSON.stringify(w.env.config.providers),
  REPLAY_CLIENT_ID: w.replay.state.clientId,
  REPLAY_CLIENT_SECRET: w.replay.state.clientSecret,
  REPLICA: "main-test",
});

describe("bin/main.ts as a real process (connector-accounts rule 5)", () => {
  it("`node dist/bin/main.js --once` rotates a due row on disk, prints one report line and exits 0", async () => {
    const [id = ""] = await w.seed(1, 10 * MINUTE);
    const select = "select accessToken, refreshToken, accessTokenExpiresAt, status, refreshLease from account where id = ?";
    const before = one(w.env.db, select, id);
    // Async on purpose: the replay provider lives in this process, so a blocking spawn would never get an answer.
    const { stdout } = await run("node", ["dist/bin/main.js", "--once"], { env: environment(w.env.path), timeout: 60_000 });
    const after = one(w.env.db, select, id);
    expect(JSON.parse(stdout.trim())).toMatchObject({ due: 1, refreshed: 1, failed: [], skipped: 0, lease: "main-test" });
    expect(w.replay.state.calls.refresh).toBe(1);
    expect(after["accessToken"]).not.toBe(before["accessToken"]);
    expect(after["refreshToken"]).not.toBe(before["refreshToken"]);
    expect(new Date(String(after["accessTokenExpiresAt"])).getTime()).toBeGreaterThan(new Date(String(before["accessTokenExpiresAt"])).getTime());
    expect([after["status"], after["refreshLease"]]).toEqual(["active", null]);
  });

  it("exits 1 and names the setting when one is missing", async () => {
    const { PATH } = environment(w.env.path);
    const failed = await run("node", ["dist/bin/main.js", "--once"], { env: { PATH }, timeout: 60_000 }).catch((e: { code: number; stderr: string }) => e);
    expect(failed).toMatchObject({ code: 1, stderr: expect.stringContaining("BASE_URL is not set") });
  });
});
