import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { freshDatabase, skip, type TestDb } from "../support/db.ts";
import { runLoad } from "../support/load.ts";
import { percentile } from "../support/wait.ts";

let db: TestDb;
beforeAll(async () => {
  if (!skip) db = await freshDatabase();
}, 60_000);
afterAll(async () => {
  if (!skip) await db.close();
});

describe.skipIf(skip)("burst", () => {
  test("a 10x burst loses no job (scaled: 200/s base, 2,000/s for 20 s)", async () => {
    const r = await runLoad(db.url, "burst", [
      { perSecond: 200, seconds: 5 },
      { perSecond: 2000, seconds: 20 },
      { perSecond: 200, seconds: 5 },
    ]);
    console.log(
      JSON.stringify({
        test: "burst",
        produced: r.produced,
        completed: r.completed,
        drainMs: r.drainMs,
        lagMs: { p50: percentile(r.lagsMs, 50), p95: percentile(r.lagsMs, 95), max: percentile(r.lagsMs, 100) },
      }),
    );
    expect(r.distinct).toBe(r.produced);
    expect(r.completed).toBe(r.produced);
  }, 300_000);
});
