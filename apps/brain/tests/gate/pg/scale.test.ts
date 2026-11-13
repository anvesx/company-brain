import { performance } from "node:perf_hooks";
import { createPostgresGraphStore } from "@anvesx/graph-store";
import { openGate } from "@anvesx/visibility/gate";
import pg from "pg";
import { expect, it } from "vitest";
import { startPostgres } from "../../../../../features/graph-store/tests/support/pg/server.js";

const EDGES = Number(process.env["BRAIN_GATE_EDGES"] ?? 200_000);
const DOCS = Math.floor(EDGES / 5); // each document has about five readers
const limits = { perCheckMs: 5_000, totalMs: 60_000, top: 100_000 };

it(`gate p95 on ${EDGES} edges: opening 25 documents, and one full 2,000-document approve`, async (ctx) => {
  const db = await startPostgres().catch((e: Error) => (process.env["CI"] === "true" ? Promise.reject(e) : undefined));
  if (!db) return ctx.skip();
  const pool = new pg.Pool({ connectionString: db.url });
  try {
    const store = await createPostgresGraphStore({ pool });
    const sql = (q: string) => pool.query(q);
    await sql(`INSERT INTO nodes (tenant,id,kind,source,address,title,version,props,valid_from)
      SELECT 't','d'||g,'document','drive','a'||g,'t'||g,'1','[["zone","company"]]',1 FROM generate_series(1,${DOCS}) g`);
    await sql(`INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from)
      SELECT 't','p'||(g%1000003),'d'||(g%${DOCS}+1),'can-read','drive',1 FROM generate_series(1,${EDGES - 2_000}) g ON CONFLICT DO NOTHING`);
    await sql(`INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT 't','me','d'||g,'can-read','drive',1 FROM generate_series(1,2000) g`);
    await sql("ANALYZE");
    const plan = await sql(
      `EXPLAIN ANALYZE SELECT from_id,to_id FROM edges WHERE tenant='t' AND valid_to IS NULL AND to_id = ANY(ARRAY(SELECT 'd'||g FROM generate_series(1,25) g)) AND kind='can-read'`,
    );
    console.log(plan.rows.map((r) => r["QUERY PLAN"]).join("\n"));
    const who = { tenant: "t", user: "me" };
    const ms: number[] = [];
    for (let i = 0; i < 40; i++) {
      const ids = Array.from({ length: 25 }, (_, k) => `d${((i * 977 + k * 31) % 2000) + 1}`);
      const t = performance.now();
      expect((await openGate(store, who, { recheck: async () => true, limits }).approve(ids)).size).toBe(25);
      ms.push(performance.now() - t);
    }
    const p95 = ms.sort((a, b) => a - b)[Math.floor(ms.length * 0.95) - 1] ?? 0;
    const t = performance.now();
    const all = await openGate(store, who, { recheck: async () => true, limits }).approve();
    const full = performance.now() - t;
    console.log(
      `GATE ${EDGES} edges, ${DOCS} docs: open-25 p95 ${p95.toFixed(1)} ms (max ${ms.at(-1)?.toFixed(1)}), full approve of ${all.size} docs ${full.toFixed(1)} ms`,
    );
    expect(all.size).toBe(2000);
    expect(p95).toBeLessThan(250);
  } finally {
    await pool.end();
    db.stop();
  }
}, 1_800_000);
