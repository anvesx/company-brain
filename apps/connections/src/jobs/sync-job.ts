import type { Job } from "@anvesx/job-queue";
import type { Deps } from "../deps.js";
import { syncAccount } from "../sync/account.js";

export const SYNC_QUEUE = "connections.sync";
/** Retries after the first try; the queue then moves the job to `connections.sync_dlq` and the account shows why. */
export const RETRY_LIMIT = 4;
export type SyncJob = { id: string; reason: string };

/**
 * One queued sync of one account: the same `syncAccount` the Sync now button runs. A source failure throws, so the queue retries it with
 * backoff; the final failure is dead-lettered and written to the account's health. Reauth, bad input and a deleted account end the job quietly.
 */
export const handleSync =
  (d: Deps) =>
  async (job: Job<SyncJob>): Promise<void> => {
    const out = await syncAccount(d, job.tenant, job.data.id);
    if (out.kind !== "failed") return;
    if (job.attempt >= RETRY_LIMIT)
      d.store.health.failed(job.tenant, job.data.id, `gave up after ${job.attempt + 1} tries (${out.code}); moved to the dead-letter queue`, d.now() * 1000);
    throw new Error(`source sync failed (${out.code})`);
  };
