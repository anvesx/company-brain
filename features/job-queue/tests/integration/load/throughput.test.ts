import os from "node:os";
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

describe.skipIf(skip)("throughput and queue lag", () => {
  test("1,000 jobs per second for 20 s keeps p95 queue lag under 5 s", async () => {
    const r = await runLoad(db.url, "rate", [{ perSecond: 1000, seconds: 20 }]);
    const [p50, p95, p99, max] = [50, 95, 99, 100].map((p) => percentile(r.lagsMs, p));
    const machine = `${os.cpus()[0]?.model} x${os.cpus().length}, ${Math.round(os.totalmem() / 2 ** 30)} GiB, load ${os.loadavg()[0]?.toFixed(1)}`;
    console.log(
      JSON.stringify({
        test: "throughput",
        machine,
        produced: r.produced,
        producedPerSec: Math.round(r.produced / (r.produceMs / 1000)),
        drainMs: r.drainMs,
        lagMs: { p50, p95, p99, max },
      }),
    );
    expect(r.completed).toBe(r.produced);
    expect(r.distinct).toBe(r.produced);
    expect(p95).toBeLessThan(5000);
  }, 240_000);
});
