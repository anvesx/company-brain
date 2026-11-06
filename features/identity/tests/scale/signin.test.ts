import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { count } from "../support/db.js";
import { Browser, PASSWORD, type Person, signIn, signUp } from "../support/http.js";
import { boot, type Env } from "../support/server.js";

let env: Env;
let ada: Person;
beforeAll(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
});
afterAll(() => env.close());

const TOTAL = 1000;
const WORKERS = 8;

describe("sign-in at scale", () => {
  it("rule 15: 1,000 sign-ins against SQLite finish under 30 s", { timeout: 120_000 }, async () => {
    let next = 0;
    const statuses: number[] = [];
    const worker = async () => {
      while (next < TOTAL) {
        next++;
        statuses.push((await signIn(new Browser(env.base), ada.email, PASSWORD)).status);
      }
    };
    const started = performance.now();
    await Promise.all(Array.from({ length: WORKERS }, worker));
    const ms = performance.now() - started;
    console.log(`rule 15: ${statuses.length} sign-ins in ${ms.toFixed(0)} ms at concurrency ${WORKERS} (${(ms / statuses.length).toFixed(1)} ms each)`);
    expect(statuses).toHaveLength(TOTAL);
    expect(statuses.every((s) => s === 200)).toBe(true);
    expect(count(env.db, "select count(*) as n from session where userId = ?", ada.userId)).toBe(TOTAL + 1);
    // Budget from the spec's rule 15: ~70 ms a scrypt verify on a 4-thread libuv pool floors 1,000 sign-ins near 17.5 s.
    expect(ms).toBeLessThan(30_000);
  });
});
