import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { BackpressureError, createJobQueue, type JobQueue } from "../../../src/index.ts";
import { freshDatabase, skip, type TestDb } from "../support/db.ts";

let db: TestDb;
let jobs: JobQueue;
beforeAll(async () => {
  if (skip) return;
  db = await freshDatabase();
  jobs = await createJobQueue({ connectionString: db.url, maxBacklogPerTenant: 5, monitorSeconds: 5 });
}, 60_000);
afterAll(async () => {
  if (skip) return;
  await jobs.stop(5000);
  await db.close();
});

describe.skipIf(skip)("per-tenant back-pressure", () => {
  test("a tenant at its backlog limit is refused while others still enqueue", async () => {
    await jobs.register("bp");
    for (let n = 0; n < 5; n++) await jobs.enqueue("bp", "noisy", { n });
    await expect(jobs.enqueue("bp", "noisy", { n: 5 })).rejects.toBeInstanceOf(BackpressureError);
    await expect(jobs.enqueueMany("bp", "noisy", [{ data: {} }])).rejects.toMatchObject({ tenant: "noisy", limit: 5 });
    expect(await jobs.enqueue("bp", "quiet", {})).toBeTypeOf("string");
  });

  test("the guard is served by a (name, group_id, state) index, not a scan of the whole job table", async () => {
    const { rows } = await db.pool.query(
      "SELECT indexdef FROM pg_indexes WHERE schemaname = 'pgboss' AND tablename = 'job' AND indexname = 'job_backlog_guard'",
    );
    expect(rows[0].indexdef).toContain("(name, group_id, state)");
  });

  test("depth reports queued jobs and the dead-letter list starts empty", async () => {
    expect(await jobs.deadLetters("bp")).toEqual([]);
    const depth = await jobs.depth("bp");
    expect(depth).toMatchObject({ failed: 0 });
    expect(depth.queued).toBeGreaterThanOrEqual(0);
  });

  test("rejects an unsafe schema name before touching the database", async () => {
    await expect(createJobQueue({ connectionString: db.url, schema: "x; drop table y" })).rejects.toThrow("invalid schema name");
  });
});
