import { afterAll, describe, expect, it } from "vitest";
import { out, pct, row } from "../support/report.js";
import { type Ctx, LONG } from "../support/world.js";

const COLD: Record<string, string> = {
  "/clusters": "/clusters",
  "/files": "/files?limit=50",
  "/clusters/:id (giant 50k)": "/clusters/c300",
  "/clusters/:id (root)": "/clusters/c3",
};
export function coldSuite(get: () => Ctx): void {
  const table: string[] = [];
  afterAll(() => out(`COLD (a distinct viewer per request) | TTFB p50 ms | p95 ms | p99 ms\n${table.join("\n")}`));
  describe("bob /clusters (largest visibility): cold request timed apart, warm p95 over 25 requests with the cold one excluded", () => {
    it(
      "cold first request is printed; warm p95 <= 300 ms",
      async () => {
        const { h } = get();
        const headers = { authorization: `Bearer ${await h.token("bob")}` };
        const hit = async () => {
          const t = performance.now();
          const res = await fetch(`${h.base}/clusters`, { headers });
          expect((await res.text()).length).toBeGreaterThan(0);
          expect(res.status).toBe(200);
          return performance.now() - t;
        };
        const cold = await hit();
        out(`bob /clusters COLD first request: ${cold.toFixed(1)} ms (limit 300)`);
        await hit(); // warm-up
        const ms: number[] = [];
        for (let i = 0; i < 25; i++) ms.push(await hit());
        table.push(
          row(
            "bob /clusters WARM (25, cold excluded)",
            ms.sort((a, b) => a - b),
          ),
        );
        expect(pct(ms, 0.95)).toBeLessThanOrEqual(300);
        expect(cold).toBeLessThanOrEqual(300);
      },
      LONG,
    );
  });
  describe("cold viewers: 200 distinct users (v1..v200, team half), one request each, so no per-viewer cache can help", () => {
    let n = 0;
    for (const [name, path] of Object.entries(COLD)) {
      it(
        `cold ${name}`,
        async () => {
          const { h } = get();
          const ttfb: number[] = [];
          for (let k = 0; k < 40; k++) {
            const headers = { authorization: `Bearer ${await h.token(`v${(n++ % 200) + 1}`)}` };
            const t = performance.now();
            const res = await fetch(h.base + path, { headers });
            ttfb.push(performance.now() - t);
            expect((await res.text()).length).toBeGreaterThan(0);
            expect(res.status).toBe(200);
          }
          ttfb.sort((a, b) => a - b);
          table.push(row(`COLD distinct viewers ${name} (40)`, ttfb));
          expect(pct(ttfb, 0.95)).toBeLessThanOrEqual(300);
        },
        LONG,
      );
    }
  });
}
