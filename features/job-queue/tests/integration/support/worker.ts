// Child process used by the crash and shutdown tests. Run directly by node (types are stripped).
import pg from "pg";
import { createJobQueue, stopOnSignals } from "../../../src/index.ts";

const [url, queue, mode] = [process.env["DATABASE_URL"] ?? "", process.env["QUEUE"] ?? "", process.env["MODE"] ?? "ok"];
const pool = new pg.Pool({ connectionString: url, max: 1 });
const record = (id: string, attempt: number, event: string) =>
  pool.query("INSERT INTO runs (job_id, attempt, event) VALUES ($1, $2, $3)", [id, attempt, event]);

const jobs = await createJobQueue({ connectionString: url, schema: "pgboss", monitorSeconds: 5, poolSize: 3 });
await jobs.register(queue, { recoverySeconds: 10, retryDelaySeconds: 1 });
await jobs.work(queue, async (job) => {
  await record(job.id, job.attempt, "start");
  if (mode === "hang") await new Promise(() => undefined);
  if (mode === "slow") await new Promise((resolve) => setTimeout(resolve, 3000));
  await record(job.id, job.attempt, "done");
});
await record("worker", 0, "ready");
stopOnSignals(
  jobs,
  (error) => {
    void pool.end().then(() => process.exit(error === undefined ? 0 : 1));
  },
  30_000,
  ["SIGTERM", "SIGINT"],
);
