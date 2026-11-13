import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createJobQueue, type JobQueue } from "../../../src/index.ts";
import { freshDatabase, skip, type TestDb } from "../support/db.ts";
import { until } from "../support/wait.ts";

const BACKLOG = 100_000;
let db: TestDb;
let jobs: JobQueue;
beforeAll(async () => {
  if (skip) return;
  db = await freshDatabase();
  jobs = await createJobQueue({ connectionString: db.url, monitorSeconds: 5, poolSize: 10 });
}, 60_000);
afterAll(async () => {
  if (skip) return;
  await jobs.stop(5000);
  await db.close();
});

describe.skipIf(skip)("per-tenant fairness", () => {
  test("a 100,000-job backlog from one tenant does not delay another tenant past 30 s", async () => {
    await jobs.register("fair");
    const loadStart = Date.now();
    for (let sent = 0; sent < BACKLOG; sent += 10_000)
      await jobs.enqueueMany(
        "fair",
        "whale",
        Array.from({ length: 10_000 }, (_, n) => ({ data: { n: sent + n } })),
      );
    const loadMs = Date.now() - loadStart;
    const served: Record<string, number> = { whale: 0, minnow: 0 };
    let minnowLag = -1;
    await jobs.work<{ at?: number }>(
      "fair",
      async (job) => {
        served[job.tenant] = (served[job.tenant] ?? 0) + 1;
        if (job.tenant === "minnow") minnowLag = Date.now() - (job.data.at ?? 0);
        await new Promise((resolve) => setTimeout(resolve, 20));
      },
      { concurrency: 4, tenantConcurrency: 8 },
    );
    await jobs.enqueue("fair", "minnow", { at: Date.now() });
    await until(() => minnowLag >= 0, 30_000, "the small tenant's job");
    const { rows } = await db.pool.query("SELECT count(*)::int AS waiting FROM pgboss.job WHERE name = 'fair' AND group_id = 'whale' AND state < 'active'");
    console.log(
      JSON.stringify({ test: "fairness", backlog: BACKLOG, loadMs, minnowLagMs: minnowLag, whaleServed: served["whale"], whaleStillWaiting: rows[0].waiting }),
    );
    expect(minnowLag).toBeLessThan(30_000);
    expect(rows[0].waiting).toBeGreaterThan(BACKLOG / 2);
  }, 180_000);
});
