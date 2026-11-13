import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { handleSync, RETRY_LIMIT } from "../../src/jobs/sync-job.js";
import { seed } from "../http/fixture.js";
import { bootJobs } from "./fixture.js";

let h: Awaited<ReturnType<typeof bootJobs>>;
beforeAll(async () => {
  if (!skip) h = await bootJobs();
});
afterAll(() => h?.close());

const job = (id: string, attempt = 0) => ({ id: `j-${id}-${attempt}`, tenant: "t1", data: { id, reason: "poll" }, attempt });

describe.skipIf(skip)("the sync job", () => {
  it("syncs the account and records a healthy run", async () => {
    const a = await seed(h.deps, { repo: "acme/handbook" });
    await handleSync(h.deps)(job(a.id));
    expect(h.deps.store.health.read("t1", a.id)).toMatchObject({ failures: 0, lastError: null, syncing: false });
    expect(h.deps.store.health.read("t1", a.id).lastRunAt).not.toBeNull();
  });
  it("throws on a source failure so the queue retries, and says it gave up on the last try", async () => {
    const a = await seed(h.deps, { repo: "acme/missing" });
    await expect(handleSync(h.deps)(job(a.id, 0))).rejects.toThrow(/source sync failed/);
    expect(h.deps.store.health.read("t1", a.id)).toMatchObject({ failures: 1, lastError: expect.not.stringContaining("gave up") });
    await expect(handleSync(h.deps)(job(a.id, RETRY_LIMIT))).rejects.toThrow();
    expect(h.deps.store.health.read("t1", a.id).lastError).toContain(`gave up after ${RETRY_LIMIT + 1} tries`);
  });
  it("ends quietly for an account that needs reconnect, one that is gone and one with no repository", async () => {
    const a = await seed(h.deps, { repo: "acme/handbook" });
    h.deps.store.setStatus("t1", a.id, "needs-auth");
    await expect(handleSync(h.deps)(job(a.id))).resolves.toBeUndefined();
    await expect(handleSync(h.deps)(job("nope"))).resolves.toBeUndefined();
    const b = await seed(h.deps);
    await expect(handleSync(h.deps)(job(b.id))).resolves.toBeUndefined();
  });
});
