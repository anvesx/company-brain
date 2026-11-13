import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createJobQueue, type JobQueue } from "../../../src/index.ts";
import { freshDatabase, skip, type TestDb } from "../support/db.ts";
import { sleep, until } from "../support/wait.ts";

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

describe.skipIf(skip)("idempotency keys", () => {
  test("the same key enqueued twice runs once; another tenant may reuse the key", async () => {
    await jobs.register("idem");
    const seen: string[] = [];
    await jobs.work("idem", async (job) => void seen.push(job.tenant));
    const first = await jobs.enqueue("idem", "acme", { n: 1 }, { key: "order-1" });
    const second = await jobs.enqueue("idem", "acme", { n: 1 }, { key: "order-1" });
    const other = await jobs.enqueue("idem", "globex", { n: 1 }, { key: "order-1" });
    expect(first).toBeTypeOf("string");
    expect(second).toBeNull();
    expect(other).not.toBeNull();
    await until(() => seen.length >= 2, 15_000, "both tenants' jobs");
    await new Promise((resolve) => setTimeout(resolve, 2000));
    expect([...seen].sort()).toEqual(["acme", "globex"]);
  });

  test("a key re-enqueued after completion, inside the dedupe window, returns null and never runs again", async () => {
    await jobs.register("idem-late");
    let runs = 0;
    await jobs.work("idem-late", async () => void runs++);
    await jobs.enqueue("idem-late", "acme", {}, { key: "k" });
    await until(() => runs === 1, 15_000, "first run");
    expect(await jobs.enqueue("idem-late", "acme", {}, { key: "k" })).toBeNull();
    await sleep(1500);
    expect(runs).toBe(1);
  });

  test("dedupeWindowSeconds bounds the window: once the completed row is purged the key is accepted again", async () => {
    await jobs.register("idem-short", { dedupeWindowSeconds: 1 });
    let runs = 0;
    await jobs.work("idem-short", async () => void runs++);
    await jobs.enqueue("idem-short", "acme", {}, { key: "k" });
    await until(() => runs === 1, 15_000, "first run");
    let again = await jobs.enqueue("idem-short", "acme", {}, { key: "k" });
    for (let tries = 0; again === null && tries < 600; tries++) {
      await sleep(100);
      again = await jobs.enqueue("idem-short", "acme", {}, { key: "k" });
    }
    expect(again).toBeTypeOf("string");
    await until(() => runs === 2, 15_000, "second run");
  }, 90_000);

  test("enqueueMany drops repeated keys inside one batch and across batches", async () => {
    await jobs.register("idem-many");
    const batch = [
      { data: { n: 1 }, key: "a" },
      { data: { n: 2 }, key: "a" },
      { data: { n: 3 }, key: "b" },
    ];
    expect(await jobs.enqueueMany("idem-many", "acme", batch)).toBe(2);
    expect(await jobs.enqueueMany("idem-many", "acme", batch)).toBe(0);
  });
});
