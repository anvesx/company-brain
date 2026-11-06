import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as gs from "../../../src/index.js";
import { likeArg } from "../../../src/postgres/titles/filter.js";
import { CANDIDATES } from "../../../src/postgres/titles/scan.js";
import { searchSql } from "../../../src/postgres/titles/search.js";
import { factories, schemaPool } from "../../support/pg/factories.js";

const pgFactory = factories.find((f) => f.name === "postgres")!;
const ROWS = 60_000;

type Plan = { "Node Type": string; "Index Name"?: string; "Relation Name"?: string; Plans?: Plan[] };
/** Every step of an EXPLAIN (FORMAT JSON) tree as "<node type> <index or table>", parents first. */
const steps = (p: Plan): string[] => [`${p["Node Type"]} ${p["Index Name"] ?? p["Relation Name"] ?? ""}`.trim(), ...(p.Plans ?? []).flatMap(steps)];

// spec graph-store, title cost model: a selective needle must not read every row of the tenant.
describe.skipIf(pgFactory.skip !== undefined)("postgres: title queries use the trigram and (tenant, seq) indexes", () => {
  it(`over ${ROWS} rows, the scan candidates and the search plan an index scan and no Seq Scan`, async () => {
    const pool = await schemaPool(`t_${randomBytes(6).toString("hex")}`);
    await gs.createPostgresGraphStore({ pool });
    // Two tenants of 30k rows each. Only 20 titles, all in t1, hold the rare word "quokka".
    await pool.query(
      `INSERT INTO nodes (tenant, id, kind, source, address, title, version, props, valid_from)
       SELECT CASE WHEN i % 2 = 0 THEN 't1' ELSE 't2' END, 'n' || i, 'document', 'test', 'a' || i,
         CASE WHEN i % 3000 = 0 THEN 'quokka report ' || i ELSE 'weekly report ' || md5(i::text) END, '1', '{}', 0
       FROM generate_series(1, $1::int) i`,
      [ROWS],
    );
    await pool.query("ANALYZE nodes"); // fresh statistics, as autovacuum would have after a real import
    const explain = async (sql: string, args: unknown[]) => steps((await pool.query(`EXPLAIN (FORMAT JSON) ${sql}`, args)).rows[0]["QUERY PLAN"][0].Plan);
    const search = searchSql("t1", { text: "quokka", limit: 20 });
    const plans = { candidates: await explain(CANDIDATES, ["t1", 0, likeArg("quokka"), 4096]), search: await explain(search.sql, search.args) };
    for (const [name, plan] of Object.entries(plans)) {
      const shown = `${name}: ${plan.join(" > ")}`;
      expect(
        plan.filter((s) => s.startsWith("Seq Scan")),
        shown,
      ).toEqual([]);
      expect(
        plan.some((s) => /^(Bitmap Index Scan|Index Scan) nodes_(title_trgm|tenant_seq)$/.test(s)),
        shown,
      ).toBe(true);
    }
    const all = searchSql("t1", { text: "quokka", limit: 50 });
    expect((await pool.query(all.sql, all.args)).rowCount).toBe(20); // the seed is what the plans assumed
  });
});
