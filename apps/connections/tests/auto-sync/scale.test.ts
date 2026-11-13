import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBuiltinRegistry } from "@anvesx/connectors";
import { startReplay } from "@anvesx/connectors/testing/replay";
import { createGraphStore } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { startJobs } from "../../src/jobs/queue.js";
import { tempStore } from "../accounts/fixture.js";
import { seed } from "../http/fixture.js";
import { data, databaseUrl } from "../pg/db.js";
import { routes } from "../sync/fixture.js";

const TENANTS = 12;
const PER = 10;
const N = TENANTS * PER;
let close: () => Promise<void> = async () => {};
afterAll(() => close());

describe.skipIf(skip)("scale", () => {
  it(`drains ${N} accounts over ${TENANTS} tenants through the queue and reports queue depth and p95`, async () => {
    const gh = await startReplay(routes);
    const t = tempStore();
    const dir = mkdtempSync(join(tmpdir(), "conn-scale-"));
    const d = await data(dir, Date.now);
    const graph = createGraphStore({ path: join(dir, "graph.db") });
    const deps = {
      store: t.store,
      vault: d.vault,
      cursors: d.cursors,
      secret: "x".repeat(32),
      now: () => Date.now() / 1000,
      isAdmin: () => false,
      catalog: createBuiltinRegistry(),
      sync: { graph, githubApiUrl: gh.url },
    };
    const jobs = await startJobs(deps, {
      databaseUrl: databaseUrl(),
      pollMinutes: 15,
      tenantConcurrency: 2,
      maxBacklogPerTenant: 100,
      schema: `scale_${Date.now()}`,
    });
    close = async () => {
      await jobs.stop();
      graph.close();
      await d.close();
      t.done();
      await gh.close();
      rmSync(dir, { recursive: true, force: true });
    };
    const ids: { tenant: string; id: string }[] = [];
    for (let i = 0; i < N; i++)
      ids.push({ tenant: `tenant-${i % TENANTS}`, id: (await seed(deps, { tenant: `tenant-${i % TENANTS}`, repo: "acme/handbook" })).id });

    const start = Date.now();
    const out = await jobs.tick();
    expect(out).toEqual({ queued: N, skipped: 0 });
    const peak = (await jobs.queue.depth("connections.sync")).queued;
    const done = new Map<string, number>();
    while (done.size < N && Date.now() - start < 120_000) {
      for (const a of ids) if (!done.has(a.id) && t.store.health.read(a.tenant, a.id).lastRunAt) done.set(a.id, Date.now() - start);
      await new Promise((r) => setTimeout(r, 50));
    }
    const ms = [...done.values()].sort((a, b) => a - b);
    const p95 = ms[Math.ceil(ms.length * 0.95) - 1] ?? 0;
    console.log(
      `SCALE accounts=${N} tenants=${TENANTS} concurrency=2/tenant queued_peak=${peak} drained=${done.size} total_ms=${ms.at(-1)} p50_ms=${ms[Math.floor(ms.length / 2)]} p95_ms=${p95}`,
    );
    expect(done.size).toBe(N);
    expect(await jobs.queue.deadLetters("connections.sync")).toEqual([]);
    expect(p95).toBeLessThan(60_000);
    expect((await jobs.tick()).queued).toBe(0); // all fresh now: the cursor skips them
  }, 150_000);
});
