import { afterAll, describe, expect, it } from "vitest";
import { HOT } from "../support/hot.js";
import { out, type Plan, pct, row, time, walk } from "../support/report.js";
import { type Ctx, LONG } from "../support/world.js";

export function dbSuite(get: () => Ctx): void {
  const rows: string[] = [];
  afterAll(() => {
    out(`DB query (real src/db builders, real fv_* indexes) | p50 ms | p95 ms | p99 ms | rows | plan nodes | indexes | ANALYZE\n${rows.join("\n")}`);
  });
  describe("module hot queries at 100k files", () => {
    for (const h of HOT) {
      it(
        `${h.name}: keyset, bounded, indexed, p95 <= 150 ms`,
        async () => {
          const { pool } = get().w;
          expect(h.build(0).sql).not.toMatch(/\bOFFSET\b/i);
          let n = 0;
          const ms = await time(200, async (i) => {
            const q = h.build(i);
            n = Math.max(n, (await pool.query(q.sql, q.args)).rowCount ?? 0);
          });
          const q = h.build(7);
          const ex = (await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${q.sql}`, q.args)).rows[0]["QUERY PLAN"][0];
          const nodes = walk(ex.Plan as Plan);
          const seq = nodes.filter((p) => p["Node Type"] === "Seq Scan" && ["nodes", "edges"].includes(p["Relation Name"] ?? ""));
          const idx = [...new Set(nodes.flatMap((p) => p["Index Name"] ?? []))];
          const types = [...new Set(nodes.map((p) => p["Node Type"]))].join(",");
          const bufs = `buffers hit ${ex.Plan["Shared Hit Blocks"]} read ${ex.Plan["Shared Read Blocks"]}`;
          rows.push(row(h.name, ms, `${n} | ${types} | ${idx.join(",")} | exec ${ex["Execution Time"]} ms, ${bufs}`));
          expect(seq, `${h.name} seq scans`).toEqual([]);
          expect(
            idx.some((x) => h.expect.includes(x)),
            `${h.name} used [${idx}], wanted one of [${h.expect}]`,
          ).toBe(true);
          expect(n).toBeLessThanOrEqual(h.max);
          expect(pct(ms, 0.95)).toBeLessThanOrEqual(150);
        },
        LONG,
      );
    }
  });
}
