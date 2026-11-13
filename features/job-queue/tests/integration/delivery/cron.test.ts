import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createJobQueue, type JobQueue, registerSchedules, SCHEDULES } from "../../../src/index.ts";
import { freshDatabase, skip, type TestDb } from "../support/db.ts";
import { until } from "../support/wait.ts";

let db: TestDb;
let jobs: JobQueue;
beforeAll(async () => {
  if (skip) return;
  db = await freshDatabase();
  jobs = await createJobQueue({ connectionString: db.url, monitorSeconds: 5 });
}, 60_000);
afterAll(async () => {
  if (skip) return;
  await jobs.stop(5000);
  await db.close();
});

describe.skipIf(skip)("cron schedules", () => {
  test("registers the poll, sweep and nightly cluster schedules", async () => {
    await registerSchedules(jobs);
    const { rows } = await db.pool.query("SELECT name, cron FROM pgboss.schedule ORDER BY name");
    expect(rows).toEqual([...SCHEDULES].map(({ queue, cron }) => ({ name: queue, cron })).sort((a, b) => a.name.localeCompare(b.name)));
    expect(SCHEDULES.map((s) => s.cron)).toEqual(["*/15 * * * *", "0 3 * * *", "30 2 * * *"]);
  });

  test("a scheduled job fires on its cron minute and reaches a worker", async () => {
    await registerSchedules(jobs, [{ queue: "tick", cron: "* * * * *" }]);
    let fired = 0;
    await jobs.work("tick", async (job) => {
      expect(job.tenant).toBe("system");
      fired++;
    });
    await until(() => fired >= 1, 150_000, "cron tick");
    expect(fired).toBeGreaterThanOrEqual(1);
  }, 170_000);
});
