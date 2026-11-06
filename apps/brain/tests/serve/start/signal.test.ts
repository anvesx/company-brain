import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { bearer, env, freePort, freshDb, spawnServe, until } from "../boot.js";

// SIGTERM after the server is listening, on the real process (before that: see ../stop/early.test.ts). Build is a prerequisite, so a missing bin fails loudly (never skips).
const bin = fileURLToPath(new URL("../../../dist/bin.js", import.meta.url));
if (!existsSync(bin)) throw new Error("dist/bin.js is missing: run `pnpm --filter @anvesx/brain-app build` first");
let db: Throwaway | undefined;
beforeAll(async () => {
  try {
    db = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e; // CI must measure something: no Postgres is a failure there
    console.warn(`SKIPPED: signal tests need Postgres (${(e as Error).message})`);
  }
}, 60_000);
afterAll(() => db?.stop());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// The server prints "brain listening" before it migrates. Migration, identity start-up and better-auth's own
// seeding all run after that line, so delays around +0..+200 ms bracket the moment the migration finishes.
describe("SIGTERM while the server is still migrating or seeding", () => {
  for (const delay of [0, 20, 50, 80, 100, 130, 170, 250])
    for (const round of [1, 2, 3])
      it(`+${delay} ms after listening (round ${round}): exit 0, no ERROR line, no stack, and the next boot migrates`, async (ctx) => {
        if (!db) return ctx.skip();
        const url = await freshDb(db);
        const e = { ...env(url), PORT: String(await freePort()) };
        const first = spawnServe(bin, e);
        await first.saw(/brain listening/);
        await sleep(delay);
        first.child.kill("SIGTERM");
        const r = await first.exit;
        expect(r.err).not.toContain("Cannot use a pool");
        expect(r.err).not.toMatch(/ERROR|\n\s+at /); // one log line at most, never an error or a stack
        expect(r.code).toBe(0);

        const second = spawnServe(bin, e);
        const headers = { authorization: bearer("u1", "acme") };
        await until(async () => (await fetch(`http://127.0.0.1:${e.PORT}/v1/documents`, { headers })).status === 200, 30_000);
        second.child.kill("SIGTERM");
        expect((await second.exit).code).toBe(0);
      }, 60_000);
});
