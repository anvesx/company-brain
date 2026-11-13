import { type AsyncGraphStore, createPostgresGraphStore } from "@anvesx/graph-store";
import { openGate } from "@anvesx/visibility/gate";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";

let db: Throwaway | undefined;
let pool: pg.Pool;
let store: AsyncGraphStore;
const n = (id: string, kind: "person" | "document", props: Record<string, string> = {}) => ({
  tenant: "t",
  id,
  kind,
  source: "drive",
  address: id,
  title: id,
  version: "1",
  props,
});
const allow = async () => true;

beforeAll(async () => {
  try {
    db = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e;
    return console.warn(`gate Postgres tests skipped: ${(e as Error).message}`);
  }
  pool = new pg.Pool({ connectionString: db.url });
  store = await createPostgresGraphStore({ pool });
  for (const x of [
    n("ann", "person"),
    n("bob", "person"),
    n("co", "document", { zone: "company" }),
    n("mine", "document", { zone: "personal", owner: "ann" }),
    n("bobs", "document", { zone: "personal", owner: "bob" }),
    n("nozone", "document"),
  ])
    await store.upsertNode(x, 1);
  for (const [from, to] of [
    ["ann", "co"],
    ["bob", "co"],
    ["ann", "mine"],
    ["bob", "mine"],
    ["ann", "bobs"],
    ["ann", "nozone"],
  ] as const)
    await store.addEdge({ tenant: "t", from, to, kind: "can-read", source: "drive" }, 1);
}, 90_000);
afterAll(async () => {
  await store?.close();
  await pool?.end();
  db?.stop();
});

const seen = async (recheck?: typeof allow) =>
  [...(await openGate(store, { tenant: "t", user: "ann" }, { recheck }).approve()).entries()].map(([id, a]) => [id, a.readers?.sort()]);

describe("the shared gate on real Postgres", () => {
  it("leak 1: with no live check nothing is approved", async (ctx) => {
    if (!db) return ctx.skip();
    expect(await seen()).toEqual([]);
  });
  it("leaks 2 and 3: a false check or a bad zone hides; company and own personal documents pass", async (ctx) => {
    if (!db) return ctx.skip();
    expect((await seen(async () => false)).length).toBe(0);
    expect((await seen(allow)).map(([id]) => id).sort()).toEqual(["co", "mine"]); // bobs: someone else's zone, nozone: no zone
  });
  it("leak 4: readers are shown to the owner only, never for a company document", async (ctx) => {
    if (!db) return ctx.skip();
    expect(Object.fromEntries(await seen(allow))).toEqual({ co: undefined, mine: ["ann", "bob"] });
  });
});
