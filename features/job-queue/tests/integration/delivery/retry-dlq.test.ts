import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createJobQueue, type JobQueue } from "../../../src/index.ts";
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

describe.skipIf(skip)("retries and dead letters", () => {
  test("a failing job backs off, then lands in the dead-letter queue with its error", async () => {
    await jobs.register("dlq", { retryLimit: 2, retryDelaySeconds: 1 });
    const stamps: number[] = [];
    await jobs.work("dlq", async () => {
      stamps.push(Date.now());
      throw new Error("upstream 503");
    });
    await jobs.enqueue("dlq", "acme", { source: "drive" });
    await until(async () => (await jobs.deadLetters("dlq")).length === 1, 30_000, "dead letter");
    const [dead] = await jobs.deadLetters("dlq");
    expect(dead).toMatchObject({ tenant: "acme", data: { source: "drive" }, attempts: 3, error: "upstream 503" });
    expect(stamps).toHaveLength(3);
    const gaps = [(stamps[1] ?? 0) - (stamps[0] ?? 0), (stamps[2] ?? 0) - (stamps[1] ?? 0)];
    expect(gaps.every((gap) => gap >= 400)).toBe(true);
    expect(await jobs.deadLetters("dlq")).toHaveLength(1);
  }, 60_000);

  test("a job that fails once then succeeds never reaches the dead-letter queue", async () => {
    await jobs.register("flaky", { retryLimit: 3, retryDelaySeconds: 1 });
    let calls = 0;
    await jobs.work("flaky", async () => {
      if (++calls === 1) throw new Error("transient");
    });
    await jobs.enqueue("flaky", "acme", {});
    await until(() => calls === 2, 20_000, "retry");
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(calls).toBe(2);
    expect(await jobs.deadLetters("flaky")).toEqual([]);
  }, 40_000);
});
