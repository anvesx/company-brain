/** The queue port. Callers import this file's types only; the library behind it stays in boss.ts. */

export type QueuePolicy = {
  retryLimit?: number;
  retryDelaySeconds?: number;
  maxRetryDelaySeconds?: number;
  expireSeconds?: number;
  /** A worker that stops heartbeating for this long (min 10) is presumed dead and its job is retried. */
  recoverySeconds?: number;
  /**
   * How long a finished job's id keeps refusing the same idempotency key (default 7 days). This is
   * enqueue de-duplication, not delivery: inside the window a repeated key returns null and never
   * runs again; after it the key is accepted as new work. It is the queue's completed-job retention.
   */
  dedupeWindowSeconds?: number;
};

export type Job<T> = { id: string; tenant: string; data: T; attempt: number };
export type Handler<T> = (job: Job<T>) => Promise<void>;
export type WorkOptions = { concurrency?: number; tenantConcurrency?: number; batchSize?: number };
export type EnqueueOptions = { key?: string; delaySeconds?: number };
export type DeadLetter = { id: string; tenant: string; data: object; sourceId: string; attempts: number; error: string; failedAt: Date };
export type Depth = { queued: number; active: number; failed: number };

export class BackpressureError extends Error {
  readonly tenant: string;
  readonly limit: number;
  constructor(tenant: string, limit: number) {
    super(`tenant ${tenant} already has ${limit} queued jobs`);
    this.tenant = tenant;
    this.limit = limit;
  }
}

export interface JobQueue {
  /** Create the queue and its dead-letter queue. Safe to call on every boot. */
  register(queue: string, policy?: QueuePolicy): Promise<void>;
  /**
   * Returns the job id, or null when the idempotency key was already used for this tenant within the
   * queue's dedupe window (`dedupeWindowSeconds`). Delivery of an accepted job is separate and
   * at least once: a handler that dies before its ack runs again, so handlers must be idempotent.
   */
  enqueue(queue: string, tenant: string, data: object, options?: EnqueueOptions): Promise<string | null>;
  /** Queues at most the tenant's remaining backlog room and returns how many were accepted; the rest (items.length minus the result) were refused. Throws BackpressureError when there is no room at all. */
  enqueueMany(queue: string, tenant: string, items: Array<{ data: object; key?: string }>): Promise<number>;
  work<T extends object>(queue: string, handler: Handler<T>, options?: WorkOptions): Promise<void>;
  schedule(queue: string, cron: string, data?: object): Promise<void>;
  deadLetters(queue: string, limit?: number): Promise<DeadLetter[]>;
  depth(queue: string): Promise<Depth>;
  /** Stop taking jobs, wait for running handlers up to timeoutMs, then close the pool. */
  stop(timeoutMs?: number): Promise<void>;
}
