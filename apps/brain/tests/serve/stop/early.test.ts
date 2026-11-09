import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { env, freshDb } from "../boot.js";

// A SIGTERM that lands while `bin.js` is still loading its modules, on the real process. A missing build fails loudly.
const bin = fileURLToPath(new URL("../../../dist/bin.js", import.meta.url));
if (!existsSync(bin)) throw new Error("dist/bin.js is missing: run `pnpm --filter @anvesx/brain-app build` first");
let db: Throwaway | undefined;
beforeAll(async () => {
  try {
    db = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e; // CI must measure something: no Postgres is a failure there
    console.warn(`SKIPPED: early-signal tests need Postgres (${(e as Error).message})`);
  }
}, 60_000);
afterAll(() => db?.stop());

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// No JavaScript can catch a signal before bin.js has registered its handler (its first statements). This preload
// prints a marker the moment that handler is added (`newListener` fires synchronously inside `process.once`); the
// signal goes out a few ms later, while bin.js is still loading its modules. A marker printed when node was merely
// up let the signal land before the handler under a loaded machine (killed by SIGTERM, exit code null, round 3 of 9).
const preload = 'data:text/javascript,process.on("newListener",(e)=>{if(e==="SIGTERM")console.error("handler-up")})';

describe("SIGTERM while bin.js is still loading its modules", () => {
  // On node 26 the signal handler is deferred until the dynamic import finishes, so bin.js yields one event-loop
  // turn (setImmediate) before serve(); the handler then runs first. A process told to stop must not bind, log
  // "brain listening" or migrate.
  for (const delay of [10, 20, 50])
    for (const round of [1, 2, 3])
      it(`+${delay} ms after the handler is on (round ${round}): exit 0, never listens, creates no tables`, async (ctx) => {
        if (!db) return ctx.skip();
        const url = await freshDb(db);
        const child = spawn("node", ["--import", preload, bin, "serve"], { env: { PATH: process.env["PATH"] ?? "", ...env(url) } });
        let err = "";
        child.stderr.on("data", (d) => (err += d));
        const code = new Promise((ok) => child.on("exit", (c) => ok(c))); // null when the signal killed it
        while (!err.includes("handler-up")) await sleep(1);
        await sleep(delay);
        child.kill("SIGTERM");
        expect(await code).toBe(0);
        expect(err).not.toContain("brain listening");
        const client = new pg.Client({ connectionString: url });
        await client.connect();
        const { rows } = await client.query("select count(*)::int as n from information_schema.tables where table_schema = 'public'");
        await client.end();
        expect(rows[0].n).toBe(0);
      }, 30_000);
});
