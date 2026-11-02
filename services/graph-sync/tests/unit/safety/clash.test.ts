import { describe, expect, it } from "vitest";
import { syncConnector } from "../../../src/index.js";
import { doc, listing } from "../../docs.js";
import { openStore, readers, ticker } from "../../helpers.js";

type Docs = () => ReturnType<typeof doc>[];
const run = (store: ReturnType<typeof openStore>, docs: Docs, id = "A") => syncConnector({ store, connector: listing(id, docs), tenant: "t1", now: ticker() });

describe("id clashes inside one run", () => {
  it("refuses a group whose id a user took earlier in the same run (M3)", async () => {
    const store = openStore();
    const r = await run(store, () => [doc("d1", ["eng"]), doc("d2", [], {}, ["eng"])]);
    expect(r.skipped.map((s) => s.address)).toEqual(["d2"]);
    expect(store.node("t1", "eng")?.kind).toBe("person");
    expect(readers(store, "t1", "A/d1")).toEqual(["eng"]);
    expect(readers(store, "t1", "A/d2")).toEqual([]);
  });

  it("refuses one document that lists the same id as user and as group", async () => {
    const store = openStore();
    const r = await run(store, () => [doc("d1", ["eng"], {}, ["eng"])]);
    expect(r.skipped.map((s) => s.address)).toEqual(["d1"]);
    expect(readers(store, "t1", "A/d1")).toEqual([]);
  });

  it("never turns a team into a document, whichever comes first", async () => {
    for (const order of [0, 1]) {
      const store = openStore();
      const items = [doc("S/eng", ["a"]), doc("d", [], {}, ["eng"])];
      const resolve = (k: "person" | "team", raw: string): string => (k === "team" ? `S/${raw}` : raw);
      const connector = listing("S", () => (order ? items.reverse() : items));
      const r = await syncConnector({ store, connector, tenant: "t1", now: ticker(), resolve });
      expect(r.skipped).toHaveLength(1);
      expect(["document", "team"]).toContain(store.node("t1", "S/eng")?.kind);
      expect(store.history("t1", "S/eng").map((n) => n.kind)).toHaveLength(1);
    }
  });

  it("skips the later of two addresses that map to one node, and never overwrites", async () => {
    const store = openStore();
    const r = await run(store, () => [doc("x", ["first"]), doc("A/x", ["second"])]);
    expect(r.skipped.map((s) => s.address)).toEqual(["A/x"]);
    expect(store.node("t1", "A/x")?.address).toBe("x");
    expect(readers(store, "t1", "A/x")).toEqual(["first"]);
  });

  it("still lets the same address listed twice converge on the last", async () => {
    const store = openStore();
    const r = await run(store, () => [doc("x", ["a"]), doc("x", ["b"])]);
    expect(r.skipped).toEqual([]);
    expect(readers(store, "t1", "A/x")).toEqual(["b"]);
  });

  describe("a connector's own root id", () => {
    const sync = (store: ReturnType<typeof openStore>, id: string, now: () => number, groups: string[] = []) =>
      syncConnector({ store, connector: listing(id, () => [doc("d", [], {}, groups)]), tenant: "t1", now });

    it("is never flipped to a team, and the connector refuses to run over a team (F1)", async () => {
      const store = openStore();
      const now = ticker();
      await sync(store, "S", now, ["connector:T"]);
      for (let i = 0; i < 2; i++) {
        await expect(sync(store, "T", now)).rejects.toMatchObject({ code: "BAD_INPUT", message: expect.stringContaining("not a project") });
      }
      expect(store.history("t1", "connector:T").map((n) => [n.kind, n.source])).toEqual([["team", "S"]]);
      expect(store.node("t1", "T/d")).toBeUndefined();
    });

    it("keeps the project when the other connector lists it later, and a second run writes nothing", async () => {
      const store = openStore();
      const now = ticker();
      await sync(store, "T", now);
      const r = await sync(store, "S", now, ["connector:T"]);
      expect(r.skipped.map((s) => s.address)).toEqual(["d"]);
      expect(store.history("t1", "connector:T").map((n) => n.kind)).toEqual(["project"]);
      expect(await sync(store, "T", now)).toMatchObject({ nodes: 0, edges: 0 });
    });
  });
});
