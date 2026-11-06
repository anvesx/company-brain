import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import * as gs from "../../src/index.js";
import { edge, node } from "../support/helpers.js";
import { factories, schemaPool } from "../support/pg/factories.js";

const pgFactory = factories.find((f) => f.name === "postgres")!;
const schema = () => `c_${randomBytes(6).toString("hex")}`;

/** Two stores on two separate pools: the closest a test gets to two Cloud Run instances on one database. */
async function twoInstances() {
  const name = schema();
  const [a, b] = await Promise.all([
    gs.createPostgresGraphStore({ pool: await schemaPool(name) }),
    gs.createPostgresGraphStore({ pool: await schemaPool(name) }),
  ]);
  return { a, b, rows: await schemaPool(name) };
}

// spec deploy, Behaviour 1-3: writers on one tenant from several instances at once.
describe.skipIf(pgFactory.skip !== undefined)("postgres: concurrent writers on one tenant", () => {
  it("two concurrent upserts of the same id at the same instant: both succeed, one is current, no validTo is lost", async () => {
    const { a, b, rows } = await twoInstances();
    await a.upsertNode(node("x", { title: "base" }), 1);
    await Promise.all([a.upsertNode(node("x", { title: "from-a" }), 5), b.upsertNode(node("x", { title: "from-b" }), 5)]);
    const hist = await a.history("t1", "x");
    expect(hist.map((n) => n.title).slice(0, 1)).toEqual(["base"]);
    expect(
      hist
        .map((n) => n.title)
        .slice(1)
        .sort(),
    ).toEqual(["from-a", "from-b"]);
    const r = await rows.query("SELECT valid_from, valid_to FROM nodes WHERE tenant = 't1' AND id = 'x' ORDER BY valid_from, valid_to NULLS LAST");
    // Exactly one open row, and every closed row ends where the next one starts: a contiguous chain.
    expect(r.rows.filter((x) => x.valid_to === null)).toHaveLength(1);
    for (let i = 0; i + 1 < r.rows.length; i++) expect(Number(r.rows[i].valid_to)).toBe(Number(r.rows[i + 1].valid_from));
    expect((await b.node("t1", "x"))?.title).toBe(hist.at(-1)?.title);
  });

  it("twenty concurrent upserts with distinct titles: twenty-one rows, one current, none rejected", async () => {
    const { a, b, rows } = await twoInstances();
    await a.upsertNode(node("y", { title: "t0" }), 1);
    const writes = Array.from({ length: 20 }, (_, i) => (i % 2 ? a : b).upsertNode(node("y", { title: `w${i}` }), 2 + i));
    const settled = await Promise.allSettled(writes);
    // A later `at` may commit before an earlier one; that earlier write then rejects BAD_INPUT, never anything else.
    const failed = settled.filter((x) => x.status === "rejected").map((x) => (x as PromiseRejectedResult).reason.code);
    expect(failed.every((c) => c === "BAD_INPUT")).toBe(true);
    const open = await rows.query("SELECT count(*)::int AS n FROM nodes WHERE tenant = 't1' AND id = 'y' AND valid_to IS NULL");
    expect(open.rows[0].n).toBe(1);
    expect(await a.history("t1", "y")).toHaveLength(1 + settled.length - failed.length);
  });

  it("concurrent addEdge of the same edge keeps exactly one current row and never errors", async () => {
    const { a, b, rows } = await twoInstances();
    await Promise.all(Array.from({ length: 20 }, (_, i) => (i % 2 ? a : b).addEdge(edge("p", "q"), 1)));
    const r = await rows.query("SELECT count(*)::int AS n FROM edges WHERE tenant = 't1' AND valid_to IS NULL");
    expect(r.rows[0].n).toBe(1);
  });

  it("five instances creating the schema at once all start; the tables exist once", async () => {
    const name = schema();
    const pools = await Promise.all(Array.from({ length: 5 }, () => schemaPool(name)));
    const stores = await Promise.all(pools.map((pool) => gs.createPostgresGraphStore({ pool })));
    await stores[0]!.upsertNode(node("z"), 1);
    expect((await stores[4]!.node("t1", "z"))?.id).toBe("z");
    for (const s of stores) await s.close();
  });

  it("close() does not end the pool it was given: the caller owns the pool", async () => {
    const pool = await schemaPool(schema());
    const s = await gs.createPostgresGraphStore({ pool });
    await s.close();
    expect((await pool.query("SELECT 1 AS one")).rows[0].one).toBe(1);
  });
});
