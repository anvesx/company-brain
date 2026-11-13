import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
const N = 10; // N roots, N children each, N grandchildren each: N + N^2 + N^3 clusters, one file per leaf
const g = `generate_series(0,${N - 1}) a, generate_series(0,${N - 1}) b, generate_series(0,${N - 1}) c`;
const node = (id: string, parent: string) =>
  `SELECT 't1',${id},'project','brain','c/'||${id},${id},'1','[["cluster.parent","'||${parent}||'"],["cluster.type","topic"],["cluster.why","w"]]',1`;
beforeAll(async () => {
  w = await boot();
  await w.bulk(N ** 3, (i) => ({ title: `f${i}`, props: { owner: "alice", zone: "company" } }));
  for (let a = 0; a < N; a++) await w.cluster(`r${a}`, { why: "w" });
  const cols = "tenant,id,kind,source,address,title,version,props,valid_from";
  await w.pool.query(`INSERT INTO nodes (${cols}) ${node("'r'||a||'_'||b", "'r'||a")} FROM ${g} WHERE c = 0`);
  await w.pool.query(`INSERT INTO nodes (${cols}) ${node("'r'||a||'_'||b||'_'||c", "'r'||a||'_'||b")} FROM ${g}`);
  await w.pool.query(
    `INSERT INTO edges (tenant,from_id,to_id,kind,source,valid_from) SELECT 't1','b'||(a*${N * N}+b*${N}+c),'r'||a||'_'||b||'_'||c,'belongs-to','brain',1 FROM ${g}`,
  );
}, 120_000);
afterAll(() => w.close());

describe("cluster tree fan-out", () => {
  it("MEDIUM: /clusters?limit=10 on a 10x10x10 tree issues a bounded number of SQL queries (per level, not per cluster)", async () => {
    let queries = 0;
    const real = w.pool.query.bind(w.pool) as (...a: unknown[]) => unknown;
    (w.pool as unknown as { query: unknown }).query = (...a: unknown[]) => {
      queries++;
      return real(...a);
    };
    const t = Date.now();
    const r = await w.get(`/clusters?limit=${N}`, A, { headers: { accept: "application/json" } });
    const ms = Date.now() - t;
    (w.pool as unknown as { query: unknown }).query = real;
    console.log(`fanout: ${queries} queries, ${ms} ms, status ${r.status}`);
    expect(r.status).toBe(200);
    expect(queries).toBeLessThanOrEqual(150);
  }, 90_000);
});
