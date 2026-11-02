import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createGraphStore } from "../../src/index.js";
import { node, tmpDir } from "../support/helpers.js";

const NODES = 10_000;
const EDGES = 50_000;
const BUDGET_MS = 2000; // spec target is 200 ms; 2 s is the generous CI budget

describe("10k nodes / 50k edges", () => {
  it("reach at depth 5 (limit 1000) stays inside the budget", () => {
    const path = join(tmpDir(), "big.db");
    const s = createGraphStore({ path });
    // deterministic pseudo-random graph: each node links to 5 others
    for (let i = 0; i < NODES; i++) s.upsertNode(node(`n${i}`), 1);
    for (let e = 0; e < EDGES; e++) {
      const from = e % NODES;
      const to = (from * 7919 + Math.floor(e / NODES) * 104729 + 1) % NODES;
      s.addEdge({ tenant: "t1", from: `n${from}`, to: `n${to}`, kind: "links-to", source: "x" }, 1);
    }
    const opts = { kinds: ["links-to" as const], depth: 5, limit: 1000 };
    s.reach("t1", "n0", opts);
    const t0 = performance.now();
    const found = s.reach("t1", "n0", opts);
    const elapsed = performance.now() - t0;
    s.close();
    expect(found).toHaveLength(1000);
    expect(new Set(found.map((n) => n.id)).size).toBe(1000);
    expect(elapsed).toBeLessThan(BUDGET_MS);
  }, 120_000);
});
