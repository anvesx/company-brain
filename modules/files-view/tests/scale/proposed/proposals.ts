import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { HOT } from "../support/hot.js";
import { out, pct, time } from "../support/report.js";
import type { Ctx } from "../support/world.js";

const SQL = readFileSync(new URL("./001-faster-size-and-filters.sql", import.meta.url), "utf8");
const find = (name: string) => HOT.find((h) => h.name === name)?.build as (i: number) => { sql: string; args: unknown[] };

export function proposalSuite(get: () => Ctx): void {
  it("the proposed SQL returns identical rows and brings both slow queries under 50 ms p95", async () => {
    const { pool } = get().w;
    const run = (name: string) => async (i: number) => (await pool.query(find(name)(i).sql, find(name)(i).args)).rows.map((r) => r.id);
    const slow = ["list size desc deep (alice)", "filter source+mime (bob)"];
    const before = await Promise.all(slow.map(async (n) => ({ n, ms: await time(100, run(n)), rows: await run(n)(11) })));
    await pool.query(SQL);
    await pool.query("ANALYZE nodes");
    for (const b of before) {
      const ms = await time(100, run(b.n));
      out(`proposal ${b.n}: p95 ${pct(b.ms, 0.95).toFixed(1)} ms -> ${pct(ms, 0.95).toFixed(1)} ms`);
      expect(await run(b.n)(11)).toEqual(b.rows);
      expect(pct(ms, 0.95)).toBeLessThanOrEqual(50);
    }
  }, 600_000);
}
