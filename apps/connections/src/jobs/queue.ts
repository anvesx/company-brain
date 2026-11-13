import { BackpressureError, createJobQueue, type JobQueue, registerSchedules } from "@anvesx/job-queue";
import type { Deps } from "../deps.js";
import { handleSync, RETRY_LIMIT, SYNC_QUEUE, type SyncJob } from "./sync-job.js";
import { tick } from "./tick.js";

export const POLL_QUEUE = "connector.poll";
export type JobsConfig = {
  databaseUrl: string;
  pollMinutes: number;
  tenantConcurrency: number;
  maxBacklogPerTenant: number /** pg-boss schema; default `pgboss`. Tests give each run its own. */;
  schema?: string;
};
export type Jobs = Awaited<ReturnType<typeof startJobs>>;

/**
 * Starts the pg-boss queue and its workers on the same Postgres as the vault: `connections.sync` runs one account sync per job
 * (at most `tenantConcurrency` per tenant, `maxBacklogPerTenant` waiting), and a cron job on `connector.poll` queues every active account.
 */
export async function startJobs(d: Deps, c: JobsConfig) {
  const queue: JobQueue = await createJobQueue({
    connectionString: c.databaseUrl,
    maxBacklogPerTenant: c.maxBacklogPerTenant,
    ...(c.schema && { schema: c.schema }),
  });
  await queue.register(SYNC_QUEUE, { retryLimit: RETRY_LIMIT, retryDelaySeconds: 5, maxRetryDelaySeconds: 600, expireSeconds: 900 });
  await queue.work<SyncJob>(SYNC_QUEUE, handleSync(d), { tenantConcurrency: c.tenantConcurrency });
  await registerSchedules(queue, [{ queue: POLL_QUEUE, cron: `*/${c.pollMinutes} * * * *` }]);
  await queue.work(POLL_QUEUE, async () => void (await tick(d, queue, c.pollMinutes * 60)), { concurrency: 1 });
  return {
    queue,
    /** Queue one sync now (connect, repo change, webhook). `nonce` makes a repeated webhook delivery a no-op. Returns false when a full backlog dropped it (the next poll covers it). */
    async requestSync(tenant: string, id: string, reason: string, nonce: string = String(Date.now())): Promise<boolean> {
      try {
        await queue.enqueue(SYNC_QUEUE, tenant, { id, reason }, { key: `${reason}:${id}:${nonce}` });
        return true;
      } catch (e) {
        if (!(e instanceof BackpressureError)) throw e;
        return false;
      }
    },
    /** One polling pass now: what the schedule runs. */
    tick: () => tick(d, queue, c.pollMinutes * 60),
    stop: () => queue.stop(),
  };
}
