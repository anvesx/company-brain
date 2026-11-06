import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MINUTE } from "../../../../features/identity/tests/support/db.js";
import { SECRET } from "../../../../features/identity/tests/support/server.js";
import { type World, world } from "../helpers.js";

const run = promisify(execFile);
let w: World;
beforeEach(async () => {
  w = await world();
});
afterEach(async () => w.close());

/** Another process that takes the SQLite write lock, says so, and keeps it for 3 seconds. */
const LOCKER = `
  const { openSqlite } = await import("@anvesx/identity");
  const db = openSqlite(process.env.DATABASE_PATH);
  db.exec("BEGIN IMMEDIATE");
  console.log("locked");
  setTimeout(() => { db.exec("COMMIT"); process.exit(0); }, 3000);
`;

describe("a replica that meets another writer waits for it (connector-accounts rule 6)", () => {
  it("`main.js --once` started while another process holds the write lock still refreshes the row and exits 0", async () => {
    const [id = ""] = await w.seed(1, 10 * MINUTE);
    const locker = spawn("node", ["--input-type=module", "-e", LOCKER], { env: { PATH: process.env["PATH"] ?? "", DATABASE_PATH: w.env.path } });
    await new Promise<void>((ready) => locker.stdout.once("data", () => ready()));
    const env = {
      PATH: process.env["PATH"] ?? "",
      BASE_URL: w.env.base,
      AUTH_SECRET: SECRET,
      SEAL_KEY: String(w.env.config.sealKey),
      DATABASE_PATH: w.env.path,
      PROVIDERS: JSON.stringify(w.env.config.providers),
      REPLAY_CLIENT_ID: w.replay.state.clientId,
      REPLAY_CLIENT_SECRET: w.replay.state.clientSecret,
      REPLICA: "busy-test",
    };
    // Async on purpose: the replay provider lives in this process.
    const { stdout } = await run("node", ["dist/bin/main.js", "--once"], { env, timeout: 60_000 });
    expect(JSON.parse(stdout.trim())).toMatchObject({ due: 1, refreshed: 1, failed: [], skipped: 0 });
    expect(id).not.toBe("");
  });
});
