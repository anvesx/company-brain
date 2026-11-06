import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { IdentityConfig } from "../../../src/index.js";
import type { Replay } from "../replay/server.js";
import { type Env, SECRET } from "../server.js";

const run = promisify(execFile);
const child = fileURLToPath(new URL("child.mjs", import.meta.url));

/**
 * Starts `n` node processes that each call `refreshAccount(accountId)` at the same moment, against the same
 * SQLite file and the same replay provider. Returns what each printed: "refreshed" or a RefreshError code.
 * Needs `pnpm --filter @anvesx/identity build` first: the children load `dist`.
 */
export async function refreshInProcesses(env: Env, replay: Replay, cfg: Partial<IdentityConfig>, accountId: string, n = 2): Promise<string[]> {
  const childEnv = {
    PATH: process.env["PATH"] ?? "",
    BASE_URL: env.base,
    AUTH_SECRET: SECRET,
    SEAL_KEY: String(cfg.sealKey),
    DATABASE_PATH: env.path,
    PROVIDERS: JSON.stringify(cfg.providers),
    REPLAY_CLIENT_ID: replay.state.clientId,
    REPLAY_CLIENT_SECRET: replay.state.clientSecret,
    ACCOUNT_ID: accountId,
    // Start-up takes a moment, so aim a few seconds ahead.
    START_AT: String(Date.now() + 2500),
  };
  const runs = Array.from({ length: n }, () => run("node", [child], { env: childEnv, timeout: 60_000 }));
  return (await Promise.all(runs)).map((out) => out.stdout.trim());
}
