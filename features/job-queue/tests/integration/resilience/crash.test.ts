import { type ChildProcess, spawn } from "node:child_process";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createJobQueue, type JobQueue } from "../../../src/index.ts";
import { freshDatabase, skip, type TestDb } from "../support/db.ts";
import { until } from "../support/wait.ts";

let db: TestDb;
let jobs: JobQueue;
const children: ChildProcess[] = [];
const worker = (queue: string, mode: string) => {
  const child = spawn(process.execPath, [new URL("../support/worker.ts", import.meta.url).pathname], {
    env: { ...process.env, DATABASE_URL: db.url, QUEUE: queue, MODE: mode },
    stdio: "inherit",
  });
  children.push(child);
  return child;
};
const count = async (event: string) => Number((await db.pool.query("SELECT count(*) FROM runs WHERE event = $1", [event])).rows[0].count);
const exited = (child: ChildProcess) => new Promise<number | null>((resolve) => child.once("exit", (code) => resolve(code)));

beforeAll(async () => {
  if (skip) return;
  db = await freshDatabase();
  jobs = await createJobQueue({ connectionString: db.url, monitorSeconds: 5 });
}, 60_000);
afterAll(async () => {
  if (skip) return;
  for (const child of children) child.kill("SIGKILL");
  await jobs.stop(5000);
  await db.close();
});

describe.skipIf(skip)("worker process death", () => {
  test("a job in flight when the worker gets SIGKILL completes exactly once after restart", async () => {
    const first = worker("crash", "hang");
    await until(async () => (await count("ready")) === 1, 30_000, "first worker");
    await jobs.enqueue("crash", "acme", { n: 1 });
    await until(async () => (await count("start")) === 1, 30_000, "job started");
    first.kill("SIGKILL");
    expect(await exited(first)).toBeNull();
    expect(await count("done")).toBe(0);
    worker("crash", "ok");
    await until(async () => (await count("done")) === 1, 90_000, "job completed after restart");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const { rows } = await db.pool.query("SELECT attempt, event FROM runs WHERE job_id <> 'worker' ORDER BY at");
    expect(rows.filter((row) => row.event === "done")).toHaveLength(1);
    expect(rows.filter((row) => row.event === "start").map((row) => row.attempt)).toEqual([0, 1]);
  }, 150_000);
});
