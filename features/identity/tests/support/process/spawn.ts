import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { IdentityConfig } from "../../../src/index.js";
import type { Replay } from "../replay/server.js";
import { type Env, SECRET } from "../server.js";

const run = promisify(execFile);
const child = fileURLToPath(new URL("child.mjs", import.meta.url));

/** Polls `ready` every 20 ms; rejects with `what` once `limitMs` has passed. */
async function until(ready: () => boolean, what: string, limitMs: number): Promise<void> {
  const deadline = Date.now() + limitMs;
  while (!ready()) {
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${what}`);
    await new Promise((wake) => setTimeout(wake, 20));
  }
}

/**
 * Starts `n` node processes that each call `refreshAccount(accountId)` against the same SQLite file and the same
 * replay provider, and returns what each printed: "refreshed" or a RefreshError code.
 *
 * The overlap is forced, not timed: the provider parks the first refresh (`replay.state.hold`) until every other
 * child has exited. A child that starts late therefore still finds the lease taken and prints LEASED, whatever the
 * process start skew is on a loaded machine. Only then is the parked caller answered.
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
  };
  let release = (): void => {};
  replay.state.hold = new Promise<void>((answer) => {
    release = answer;
  });
  let exited = 0;
  const runs = Array.from({ length: n }, () =>
    run("node", [child], { env: childEnv, timeout: 60_000 }).finally(() => {
      exited += 1;
    }),
  );
  try {
    // The lease holder is inside its provider call, and every other child has been turned away.
    await until(() => replay.state.calls.refresh === 1 && exited === n - 1, "one parked refresh and the other children to exit", 50_000);
  } finally {
    replay.state.hold = null;
    release();
  }
  return (await Promise.all(runs)).map((out) => out.stdout.trim());
}
