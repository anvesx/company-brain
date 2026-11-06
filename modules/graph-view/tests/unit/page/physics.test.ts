import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const graph = readFileSync(new URL("../../../src/page/script/graph.js", import.meta.url), "utf8");
const spec = readFileSync(new URL("../../../../../docs/specs/feature/graph-view.md", import.meta.url), "utf8");

// Rule 5: the layout is computed before the first paint (150 ticks, 260 under reduced motion) and never animates after.
describe("rule 5: physics ticks", () => {
  it("graph.js warms up 150 ticks (260 when motion is reduced) and cools down 0", () => {
    expect(graph).toContain(".warmupTicks(calm ? 260 : 150)");
    expect(graph).toContain(".cooldownTicks(0)");
  });

  it("the spec states the same numbers", () => {
    const rule5 = spec.split("\n").find((l) => l.startsWith("5. ")) ?? "";
    expect(rule5).toMatch(/`warmupTicks` 150 \(260 under prefers-reduced-motion\)/);
    expect(rule5).toMatch(/`cooldownTicks` 0/);
  });
});
