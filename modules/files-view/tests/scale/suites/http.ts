import { afterAll, describe, expect, it } from "vitest";
import { paths } from "../http/paths.js";
import { out, pct, row } from "../support/report.js";
import { type Ctx, LONG } from "../support/world.js";

const N = 40;
export function httpSuite(get: () => Ctx): void {
  const table: string[] = [];
  afterAll(() => out(`HTTP (real Hono + JWKS + jwtAuth + pgGate, sequential) | TTFB p50 ms | p95 ms | p99 ms | total p95 ms\n${table.join("\n")}`));
  describe("HTTP TTFB at 150k files: 40 sequential requests each, p95 <= 300 ms", () => {
    for (const who of ["erin", "alice", "carol", "bob"]) {
      for (const [name, path] of Object.entries(paths(who))) {
        it(
          `${who} ${name}`,
          async () => {
            const { h } = get();
            const headers = { authorization: `Bearer ${await h.token(who)}` };
            const [first, total] = [[] as number[], [] as number[]];
            let bad = 0;
            let empty = 0; // responses with no row links: a 0-row path measures nothing
            for (let i = 0; i < N + 5; i++) {
              const t = performance.now();
              const res = await fetch(h.base + path(i), { headers });
              const f = performance.now() - t;
              const body = await res.text();
              if (!/href="\/(files\/f|clusters\/c)/.test(body) && !name.includes("leaf") && name !== "/files/:id") empty++;
              if (i < 5) continue; // warm-up
              first.push(f);
              total.push(performance.now() - t);
              if (res.status !== 200) bad++;
              expect(res.headers.get("cache-control")).toContain("no-store");
            }
            const [ttfb, all] = [first.sort((a, b) => a - b), total.sort((a, b) => a - b)];
            table.push(row(`${who} ${name}`, ttfb, pct(all, 0.95).toFixed(1)));
            expect(bad).toBe(0);
            expect(empty, `${who} ${name} returned no rows`).toBe(0);
            expect(pct(ttfb, 0.95)).toBeLessThanOrEqual(300);
          },
          LONG,
        );
      }
    }
  });
}
