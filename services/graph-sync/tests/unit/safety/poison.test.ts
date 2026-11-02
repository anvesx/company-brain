import { describe, expect, it } from "vitest";
import { syncConnector } from "../../../src/index.js";
import { doc, listing } from "../../docs.js";
import { openStore, readers, ticker } from "../../helpers.js";

const CJK = "界".repeat(200);
type Docs = () => ReturnType<typeof doc>[];
const run = (store: ReturnType<typeof openStore>, docs: Docs, now: () => number, extra = {}) =>
  syncConnector({ store, connector: listing("C", docs, extra), tenant: "t1", now });

describe("a bad entry", () => {
  it("is skipped and reported while the rest syncs and deletions still tombstone", async () => {
    const store = openStore();
    const now = ticker();
    await run(store, () => [doc("old.md", ["bob"])], now);
    const r = await run(store, () => [doc("bad\nname.md", []), doc("ok.md", ["ana"])], now);
    expect(r.skipped).toHaveLength(1);
    expect(r.skipped[0]?.address).toBe("bad\nname.md");
    expect(r.skipped[0]?.message).toMatch(/control/);
    expect(readers(store, "t1", "C/ok.md")).toEqual(["ana"]);
    expect(store.node("t1", "C/old.md")).toBeUndefined();
    expect(readers(store, "t1", "C/old.md")).toEqual([]);
    expect(r.removed).toBe(1);
  });

  it("with a 200-character CJK reader skips that document and closes its earlier readers (fail closed)", async () => {
    const store = openStore();
    const now = ticker();
    await run(store, () => [doc("a.md", ["bob"]), doc("b.md", ["bob"])], now);
    const r = await run(store, () => [doc("a.md", ["bob", CJK]), doc("b.md", ["bob"])], now);
    expect(r.skipped.map((s) => s.address)).toEqual(["a.md"]);
    expect(readers(store, "t1", "C/a.md")).toEqual([]);
    expect(readers(store, "t1", "C/b.md")).toEqual(["bob"]);
    expect(store.node("t1", CJK)).toBeUndefined();
  });

  it("recovers on the next run once the entry is valid again", async () => {
    const store = openStore();
    const now = ticker();
    await run(store, () => [doc("a.md", ["bob", CJK])], now);
    const r = await run(store, () => [doc("a.md", ["bob"])], now);
    expect(r.skipped).toEqual([]);
    expect(readers(store, "t1", "C/a.md")).toEqual(["bob"]);
  });

  it("leaves an empty skipped list on a clean run", async () => {
    expect((await run(openStore(), () => [doc("a", ["x"])], ticker())).skipped).toEqual([]);
  });

  it("in the membership list is skipped and reported, and tombstoning still runs", async () => {
    const store = openStore();
    const now = ticker();
    await run(store, () => [doc("gone", [])], now);
    const memberships = async () => [
      { group: "eng", user: "bob" },
      { group: "eng", user: CJK },
    ];
    const r = await run(store, () => [doc("a", [])], now, { listMemberships: memberships });
    expect(r.skipped).toHaveLength(1);
    expect(store.neighbors("t1", "bob", { kind: "member-of", dir: "out" })).toHaveLength(1);
    expect(store.node("t1", "C/gone")).toBeUndefined();
  });
});
