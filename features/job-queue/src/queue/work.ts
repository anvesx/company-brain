import type { Handler, WorkOptions } from "../types.ts";
import { type RawJob, toJob } from "./map.ts";

type Worker = { work(name: string, options: object, handler: (jobs: RawJob[]) => Promise<unknown>): Promise<string> };

const failure = (error: unknown) => ({ message: error instanceof Error ? error.message : String(error) });

/**
 * Runs each fetched batch concurrently and settles every job on its own, so one failing job never
 * fails its neighbours. `tenantConcurrency` caps running jobs per tenant across all worker nodes.
 */
export async function startWorker<T extends object>(boss: Worker, queue: string, handler: Handler<T>, o: WorkOptions = {}): Promise<void> {
  const settle = async (job: RawJob) => {
    try {
      await handler(toJob<T>(job));
      return { id: job.id, status: "completed" as const };
    } catch (error) {
      return { id: job.id, status: "failed" as const, output: failure(error) };
    }
  };
  const options = {
    localConcurrency: o.concurrency ?? 4,
    groupConcurrency: o.tenantConcurrency ?? 8,
    batchSize: o.batchSize ?? 10,
    pollingIntervalSeconds: 0.5,
    perJobResults: true,
  };
  await boss.work(queue, options, (jobs) => Promise.all(jobs.map(settle)));
}
