import { cpus, loadavg } from "node:os";
import { performance } from "node:perf_hooks";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { MINUTE } from "../../../../features/identity/tests/support/db.js";
import { sweep } from "../../src/index.js";
import { type World, world } from "../helpers.js";

const ROWS = 10_000;
const BUDGET_MS = 10_000;
// CPU time does not grow when other programs steal the machine, so this budget holds under load. Measured: about 5 000 ms.
const CPU_BUDGET_MS = 7_000;
let w: World;

// Seeding 10 000 sealed rows through the adapter is slow and is not what this test times.
beforeAll(async () => {
  w = await world();
  await w.seed(ROWS, 10 * MINUTE);
}, 300_000);
afterAll(async () => w.close());

describe("sweep at scale (connector-accounts rule 7)", () => {
  it("rule 7: 10 000 due rows are swept, each refreshed once against the provider, in under 10 seconds and 7 s of cpu", async () => {
    // Wall time only means something on a quiet machine: with the 1-minute load average at or above the core count, it is not judged.
    const load = loadavg()[0] ?? 0;
    const quiet = load < cpus().length;
    const deps = { adapter: w.adapter, refresh: w.env.identity.refreshAccount, now: w.env.clock.now, lease: "scale" };
    const cpu = process.cpuUsage();
    const started = performance.now();
    const report = await sweep(deps);
    const took = performance.now() - started;
    const busy = process.cpuUsage(cpu);
    // The denominator is printed so a reader sees the real number, not just "passed".
    console.log(
      `token-refresh sweep: ${report.refreshed}/${ROWS} rows in ${Math.round(took)} ms (budget ${BUDGET_MS} ms), cpu ${Math.round((busy.user + busy.system) / 1000)} ms`,
    );
    expect(report).toEqual({ due: ROWS, refreshed: ROWS, failed: [], skipped: 0 });
    expect(w.replay.state.calls.refresh).toBe(ROWS);
    // Judged on any machine: the work the sweep itself did.
    expect((busy.user + busy.system) / 1000).toBeLessThanOrEqual(CPU_BUDGET_MS);
    if (quiet) expect(took).toBeLessThan(BUDGET_MS);
    else console.log(`SKIPPED: load ${load.toFixed(2)}, budget not judged`);
  }, 120_000);
});
