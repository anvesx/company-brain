import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createJobQueue, type JobQueue, stopOnSignals } from "../../src/index.ts";
import { freshDatabase, skip, type TestDb } from "./support/db.ts";
import { until } from "./support/wait.ts";

let db: TestDb;
let jobs: JobQueue;
beforeAll(async () => {
  if (skip) return;
  db = await freshDatabase();
  jobs = await createJobQueue({ connectionString: db.url });
}, 60_000);
afterAll(async () => {
  if (skip) return;
  await db.close();
});

describe.skipIf(skip)("default options", () => {
  test("a queue built with defaults runs keyless and delayed jobs and reports depth", async () => {
    await jobs.register("plain");
    const delayed = await jobs.enqueue("plain", "acme", { n: 1 }, { delaySeconds: 1 });
    const keyless = await jobs.enqueue("plain", "acme", { n: 2 });
    expect(delayed).not.toBeNull();
    expect(keyless).not.toBeNull();
    expect((await jobs.depth("plain")).queued + (await jobs.depth("plain")).active).toBeGreaterThanOrEqual(1);
    let runs = 0;
    await jobs.work("plain", async () => void runs++);
    await until(() => runs === 2, 20_000, "both jobs");
  }, 60_000);

  test("a second signal does not stop twice", async () => {
    let calls = 0;
    stopOnSignals(jobs, () => void calls++, 10_000, ["SIGUSR1", "SIGUSR2"]);
    process.emit("SIGUSR2");
    process.emit("SIGUSR1");
    await until(() => calls >= 1, 20_000, "done callback");
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(calls).toBe(1);
  }, 60_000);
});
