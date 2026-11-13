import { describe, expect, it } from "vitest";
import { visibleFiles } from "../../../src/gate/visible.js";
import { pgGate } from "../../../src/index.js";
import { out, pct, time } from "../support/report.js";
import { type Ctx, LONG } from "../support/world.js";

export function gatedSuite(get: () => Ctx): void {
  const files = async (user: string, q: Record<string, unknown> = {}) => {
    const { pool } = get().w;
    const gate = await pgGate(pool, { recheck: async () => true, limits: { perCheckMs: 5_000, totalMs: 60_000, top: 2_000 } });
    return visibleFiles(pool, gate({ tenant: "t1", user }), "t1", { sort: "modified", dir: "desc", limit: 100, ...q } as never);
  };
  describe("the real scan-then-gate loop (visibleFiles) at 125k files", () => {
    it(
      "alice sees 1 file in 50: the whole list is exactly her 2,000 files, 100 per page, no duplicates",
      async () => {
        const seen: string[] = [];
        let cursor: string | undefined;
        let pages = 0;
        do {
          const p = await files("alice", cursor ? { cursor } : {});
          if (p.next) expect(p.rows.length).toBe(100);
          seen.push(...p.rows.map((r) => r.id));
          cursor = p.next;
          pages++;
        } while (cursor);
        out(`alice: ${seen.length} files in ${pages} pages`);
        expect(seen.length).toBe(2000);
        expect(new Set(seen).size).toBe(2000);
        expect(seen.every((id) => Number(id.slice(1)) % 50 === 0)).toBe(true);
      },
      LONG,
    );
    it(
      "p95 of a gated page for alice and bob, 200 sequential runs, <= 150 ms",
      async () => {
        for (const user of ["alice", "bob"]) {
          const ms = await time(200, () => files(user, { limit: 50 }));
          out(`gated first page ${user}: p50 ${pct(ms, 0.5).toFixed(1)} p95 ${pct(ms, 0.95).toFixed(1)} p99 ${pct(ms, 0.99).toFixed(1)} ms`);
          expect(pct(ms, 0.95)).toBeLessThanOrEqual(150);
        }
      },
      LONG,
    );
    it(
      "a page never exceeds the page cap even when everything is visible",
      async () => {
        expect((await files("bob", { limit: 100 })).rows.length).toBeLessThanOrEqual(100);
      },
      LONG,
    );
  });
}
