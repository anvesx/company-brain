import { createJobQueue, type JobQueue } from "@anvesx/job-queue";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { SYNC_QUEUE } from "../../src/jobs/sync-job.js";
import { tick } from "../../src/jobs/tick.js";
import { sourceOf } from "../../src/sync/connector.js";
import { seed } from "../http/fixture.js";
import { databaseUrl } from "../pg/db.js";
import { bootJobs } from "./fixture.js";

let h: Awaited<ReturnType<typeof bootJobs>>;
let q: JobQueue;
beforeAll(async () => {
  if (skip) return;
  h = await bootJobs();
  q = await createJobQueue({ connectionString: databaseUrl(), schema: `tick_${Date.now()}`, maxBacklogPerTenant: 3 });
  await q.register(SYNC_QUEUE, { retryLimit: 1 }); // no worker: jobs stay queued so the counts are exact
});
afterAll(async () => {
  await q?.stop();
  await h?.close();
});

describe.skipIf(skip)("the poll tick", () => {
  it("queues each stale account once per bucket and skips accounts synced within the interval", async () => {
    await seed(h.deps, { tenant: "p1" });
    await seed(h.deps, { tenant: "p1" });
    const c = await seed(h.deps, { tenant: "p2" });
    h.deps.cursors.setCursor("p2", sourceOf(c), new Date(h.deps.now() * 1000).toISOString());
    expect(await tick(h.deps, q, 900)).toEqual({ queued: 2, skipped: 1 });
    expect(await tick(h.deps, q, 900)).toEqual({ queued: 0, skipped: 3 }); // same bucket: same keys, so nothing new is queued
    h.clock.t += 900;
    expect(await tick(h.deps, q, 900)).toEqual({ queued: 2, skipped: 1 }); // next bucket, every cursor stale, but p1 already has 2 of its 3 slots taken: only 1 fits
  });
  it("counts a tenant over its backlog limit as skipped and still queues the others", async () => {
    h.clock.t += 900;
    for (let i = 0; i < 3; i++) await seed(h.deps, { tenant: "p1" });
    const out = await tick(h.deps, q, 900);
    expect(out).toEqual({ queued: 1, skipped: 5 }); // each tenant is held to its limit of 3 waiting, even inside one batch
  });
});
