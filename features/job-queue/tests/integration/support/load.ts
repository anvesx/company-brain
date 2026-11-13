import { createJobQueue } from "../../../src/index.ts";
import { sleep, until } from "./wait.ts";

export type Phase = { perSecond: number; seconds: number };
export type LoadResult = { produced: number; completed: number; distinct: number; lagsMs: number[]; produceMs: number; drainMs: number };

/** Produce at a fixed rate in 100 ms ticks (spread over tenants) and measure enqueue-to-start lag per job. */
export async function runLoad(url: string, queue: string, phases: Phase[], tenants = 50): Promise<LoadResult> {
  const jobs = await createJobQueue({ connectionString: url, poolSize: 20, monitorSeconds: 10 });
  await jobs.register(queue);
  const lagsMs: number[] = [];
  const seen = new Set<number>();
  await jobs.work<{ n: number; t: number }>(
    queue,
    async (job) => {
      lagsMs.push(Date.now() - job.data.t);
      seen.add(job.data.n);
    },
    { concurrency: 16, batchSize: 100, tenantConcurrency: 50 },
  );
  let produced = 0;
  const start = Date.now();
  for (const phase of phases) {
    const perTick = Math.round(phase.perSecond / 10);
    const phaseStart = Date.now();
    for (let tick = 0; Date.now() - phaseStart < phase.seconds * 1000; tick++) {
      const t = Date.now();
      const items = Array.from({ length: perTick }, (_, i) => ({ data: { n: produced + i, t } }));
      await jobs.enqueueMany(queue, `tenant-${tick % tenants}`, items);
      produced += perTick;
      await sleep(Math.max(0, phaseStart + (tick + 1) * 100 - Date.now()));
    }
  }
  const produceMs = Date.now() - start;
  await until(() => seen.size === produced, 120_000, `all ${produced} jobs to complete`);
  const drainMs = Date.now() - start - produceMs;
  await jobs.stop(10_000);
  return { produced, completed: lagsMs.length, distinct: seen.size, lagsMs, produceMs, drainMs };
}
