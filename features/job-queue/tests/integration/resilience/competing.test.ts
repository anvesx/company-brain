import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createJobQueue, type JobQueue } from "../../../src/index.ts";
import { freshDatabase, skip, type TestDb } from "../support/db.ts";
import { until } from "../support/wait.ts";

let db: TestDb;
const nodes: JobQueue[] = [];
beforeAll(async () => {
  if (skip) return;
  db = await freshDatabase();
  for (let n = 0; n < 3; n++) nodes.push(await createJobQueue({ connectionString: db.url, monitorSeconds: 5, poolSize: 5 }));
}, 60_000);
afterAll(async () => {
  if (skip) return;
  await Promise.all(nodes.map((node) => node.stop(5000)));
  await db.close();
});

describe.skipIf(skip)("competing workers", () => {
  test("three nodes on one queue run each of 600 jobs exactly once", async () => {
    await nodes[0]?.register("race");
    const seenBy = new Map<string, number>();
    const done = new Set<string>();
    for (const [index, node] of nodes.entries()) {
      await node.work("race", async (job) => {
        done.add(job.id);
        seenBy.set(job.id, (seenBy.get(job.id) ?? 0) + 1);
        await db.pool.query("INSERT INTO runs (job_id, attempt, event) VALUES ($1, $2, $3)", [job.id, job.attempt, `node-${index}`]);
      });
    }
    for (let batch = 0; batch < 6; batch++)
      await nodes[0]?.enqueueMany(
        "race",
        `t${batch}`,
        Array.from({ length: 100 }, (_, n) => ({ data: { n } })),
      );
    await until(() => done.size === 600, 60_000, "600 jobs");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect([...seenBy.values()].every((count) => count === 1)).toBe(true);
    const { rows } = await db.pool.query("SELECT count(*)::int AS rows, count(DISTINCT job_id)::int AS jobs, count(DISTINCT event)::int AS nodes FROM runs");
    expect(rows[0]).toEqual({ rows: 600, jobs: 600, nodes: expect.any(Number) });
    expect(rows[0].nodes).toBeGreaterThan(1);
  }, 90_000);
});
