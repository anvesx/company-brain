import type { AccountRow } from "@anvesx/identity";
import { releaseLease, takeLease } from "./lease.js";
import { type Adapter, readRows, selectDue } from "./select.js";

/** Rows per lease write. */
export const BATCH = 500;
/** Provider calls in flight at once inside one batch. */
const CONCURRENCY = 50;
/** A provider that did not answer is asked again after 100 ms, then 200 ms, then the row is reported failed. */
const ATTEMPTS = 3;
const BACKOFF_MS = 100;

export interface SweepDeps {
  adapter: Adapter;
  /** Refresh one account, given the row already read. Throws a RefreshError (refused, provider down, STORE_FAILED). */
  refresh: (accountId: string, row?: AccountRow) => Promise<void>;
  now: () => number;
  /** This replica's name for the lease column. */
  lease: string;
  batch?: number;
}

export interface SweepReport {
  due: number;
  refreshed: number;
  failed: string[];
  skipped: number;
}

/** Run `work` on every item, at most `CONCURRENCY` at once: each worker takes the next item when free. */
async function inParallel<T>(items: T[], work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await work(items[next++] as T);
  };
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, worker));
}

/** Refresh once; on PROVIDER_DOWN (read by name, so any copy of the class works) wait longer each time and ask again. Anything else is final. */
async function withRetry(refresh: SweepDeps["refresh"], id: string, row?: AccountRow): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await refresh(id, row);
    } catch (error) {
      if (attempt === ATTEMPTS || (error as { code?: string }).code !== "PROVIDER_DOWN") throw error;
      await new Promise((wake) => setTimeout(wake, BACKOFF_MS * 2 ** (attempt - 1)));
    }
  }
}

/** One pass over every due account: page by id, lease the page in one write, refresh what we hold, give it back. */
export async function sweep(deps: SweepDeps): Promise<SweepReport> {
  const { adapter, refresh, now, lease, batch = BATCH } = deps;
  const report: SweepReport = { due: 0, refreshed: 0, failed: [], skipped: 0 };
  let after: string | undefined;
  for (;;) {
    const ids = await selectDue(adapter, now(), batch, after);
    if (ids.length === 0) return report;
    after = ids.at(-1);
    report.due += ids.length;
    const held = await takeLease(adapter, ids, lease, now());
    // Rows another replica holds, or that stopped being due, are theirs.
    report.skipped += ids.length - held.length;
    try {
      // One read for the whole page: a read per row would cost more than the provider call.
      const rows = await readRows(adapter, held);
      await inParallel(held, async (id) => {
        try {
          await withRetry(refresh, id, rows.get(id));
          report.refreshed += 1;
        } catch {
          // Refused, provider down after retries, or STORE_FAILED (not retried): listed, the rest go on.
          report.failed.push(id);
        }
      });
    } finally {
      await releaseLease(adapter, held, lease);
    }
  }
}
