import { BackpressureError, type JobQueue } from "@anvesx/job-queue";
import type { Deps } from "../deps.js";
import { sourceOf } from "../sync/connector.js";
import { SYNC_QUEUE } from "./sync-job.js";

/**
 * The polling fallback: queue one sync per active account, per tenant in one insert. The key holds the time bucket, so two replicas
 * ticking in the same bucket queue each account once. An account whose cursor (the time of its last successful sync, written by every
 * path: connect, webhook, Sync now, poll) is newer than the interval is skipped: that is the incremental part. A tenant already at its backlog limit is skipped until the next tick.
 */
export async function tick(d: Deps, queue: JobQueue, bucketSeconds: number): Promise<{ queued: number; skipped: number }> {
  const bucket = Math.floor(d.now() / bucketSeconds);
  const all = d.store.active();
  const stale = (a: (typeof all)[number]) => {
    const last = d.cursors.getCursor(a.tenant, sourceOf(a));
    return last === undefined || Date.parse(last) <= (d.now() - bucketSeconds) * 1000;
  };
  const byTenant = new Map<string, typeof all>();
  for (const a of all.filter(stale)) (byTenant.get(a.tenant) ?? byTenant.set(a.tenant, []).get(a.tenant))?.push(a);
  let queued = 0;
  let skipped = all.length - [...byTenant.values()].reduce((n, l) => n + l.length, 0);
  for (const [tenant, accounts] of byTenant) {
    const items = accounts.map((a) => ({ data: { id: a.id, reason: "poll" }, key: `poll:${a.id}:${bucket}` }));
    try {
      const accepted = await queue.enqueueMany(SYNC_QUEUE, tenant, items); // only up to the tenant's remaining room
      queued += accepted;
      skipped += items.length - accepted;
    } catch (e) {
      if (!(e instanceof BackpressureError)) throw e;
      skipped += items.length;
    }
  }
  return { queued, skipped };
}
