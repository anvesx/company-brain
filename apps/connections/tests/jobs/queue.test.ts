import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { startJobs } from "../../src/jobs/queue.js";
import { seed } from "../http/fixture.js";
import { databaseUrl } from "../pg/db.js";
import { bootJobs } from "./fixture.js";

let h: Awaited<ReturnType<typeof bootJobs>>;
beforeAll(async () => {
  if (!skip) h = await bootJobs();
});
afterAll(() => h?.close());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cfg = (n: number) => ({ databaseUrl: databaseUrl(), pollMinutes: 15, tenantConcurrency: 1, maxBacklogPerTenant: n, schema: `rq_${n}_${Date.now()}` });

describe.skipIf(skip)("requestSync", () => {
  it("runs the sync and ignores a repeat with the same nonce", async () => {
    const jobs = await startJobs(h.deps, cfg(10));
    const a = await seed(h.deps, { repo: "acme/handbook" });
    expect(await jobs.requestSync("t1", a.id, "webhook", "d1")).toBe(true);
    await jobs.requestSync("t1", a.id, "webhook", "d1");
    for (let i = 0; i < 100 && !h.deps.store.health.read("t1", a.id).lastRunAt; i++) await wait(100);
    expect(h.deps.store.health.read("t1", a.id).lastRunAt).not.toBeNull();
    expect(await jobs.queue.deadLetters("connections.sync")).toEqual([]);
    await jobs.stop();
  });
  it("drops the request without throwing when the tenant backlog is full", async () => {
    const jobs = await startJobs(h.deps, cfg(0));
    const a = await seed(h.deps, { repo: "acme/handbook" });
    await expect(jobs.requestSync("t1", a.id, "webhook", "d2")).resolves.toBe(false);
    await wait(1500);
    expect(h.deps.store.health.read("t1", a.id).lastRunAt).toBeNull();
    await jobs.stop();
  });
});
