import { spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createJobQueue, type JobQueue, stopOnSignals } from "../../../src/index.ts";
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

describe.skipIf(skip)("graceful shutdown", () => {
  test("SIGTERM to a worker process lets the running job finish, then exits 0", async () => {
    const child = spawn(process.execPath, [new URL("../support/worker.ts", import.meta.url).pathname], {
      env: { ...process.env, DATABASE_URL: db.url, QUEUE: "term", MODE: "slow" },
      stdio: "inherit",
    });
    const exit = new Promise<number | null>((resolve) => child.once("exit", (code) => resolve(code)));
    const count = async (event: string) => Number((await db.pool.query("SELECT count(*) FROM runs WHERE event = $1", [event])).rows[0].count);
    await until(async () => (await count("ready")) === 1, 30_000, "worker ready");
    await jobs.enqueue("term", "acme", {});
    await until(async () => (await count("start")) === 1, 30_000, "job started");
    child.kill("SIGTERM");
    expect(await exit).toBe(0);
    expect(await count("done")).toBe(1);
  }, 90_000);

  test("stopOnSignals waits for the in-flight handler before calling done", async () => {
    await jobs.register("inproc");
    let finished = false;
    let started = false;
    await jobs.work("inproc", async () => {
      started = true;
      await new Promise((resolve) => setTimeout(resolve, 1500));
      finished = true;
    });
    await jobs.enqueue("inproc", "acme", {});
    await until(() => started, 20_000, "handler start");
    const stopped = new Promise<boolean>((resolve) => stopOnSignals(jobs, () => resolve(finished), 20_000, ["SIGUSR2"]));
    process.emit("SIGUSR2");
    expect(await stopped).toBe(true);
  }, 60_000);
});
