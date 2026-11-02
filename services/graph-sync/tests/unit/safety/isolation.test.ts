import { describe, expect, it } from "vitest";
import { syncConnector } from "../../../src/index.js";
import { doc, listing } from "../../docs.js";
import { openStore, readers, ticker } from "../../helpers.js";
import { code } from "../../seed.js";

type Docs = () => ReturnType<typeof doc>[];
const run = (store: ReturnType<typeof openStore>, id: string, docs: Docs, now: () => number) =>
  syncConnector({ store, connector: listing(id, docs), tenant: "t1", now });

describe("one node per source", () => {
  it("keeps the same address of two connectors apart, with their own ACLs", async () => {
    const store = openStore();
    const now = ticker();
    await run(store, "A", () => [doc("plan.md", ["alice"])], now);
    await run(store, "B", () => [doc("plan.md", [])], now);
    expect(store.node("t1", "A/plan.md")?.source).toBe("A");
    expect(store.node("t1", "B/plan.md")?.source).toBe("B");
    expect(readers(store, "t1", "A/plan.md")).toEqual(["alice"]);
    expect(readers(store, "t1", "B/plan.md")).toEqual([]);
  });

  it("does not double the prefix of an address the caller already namespaced", async () => {
    const store = openStore();
    await run(store, "gh:1", () => [doc("gh:1/README.md", ["a"])], ticker());
    expect(store.node("t1", "gh:1/README.md")?.address).toBe("gh:1/README.md");
    expect(store.node("t1", "gh:1/gh:1/README.md")).toBeUndefined();
  });

  it("tombstones only its own documents", async () => {
    const store = openStore();
    const now = ticker();
    await run(store, "A", () => [doc("x", ["a"])], now);
    await run(store, "B", () => [doc("y", ["b"])], now);
    await run(store, "B", () => [], now);
    expect(store.node("t1", "A/x")).toBeDefined();
    expect(store.node("t1", "B/y")).toBeUndefined();
  });

  it("rejects a connector id with a slash, which would let two ids share a prefix", async () => {
    expect(await code(run(openStore(), "a/b", () => [], ticker()))).toBe("BAD_INPUT");
  });

  it("writes a principal shared by two connectors once, so re-runs write nothing (M8)", async () => {
    const store = openStore();
    const now = ticker();
    await run(store, "A", () => [doc("x", ["sam"])], now);
    await run(store, "B", () => [doc("y", ["sam"])], now);
    const again = await run(store, "A", () => [doc("x", ["sam"])], now);
    expect(again.nodes).toBe(0);
    expect(store.history("t1", "sam")).toHaveLength(1);
  });

  it("skips and reports a group whose id is already a user, so the kind never flips (M3)", async () => {
    const store = openStore();
    const now = ticker();
    await run(store, "A", () => [doc("x", ["eng"])], now);
    const r = await run(store, "B", () => [doc("y", [], {}, ["eng"])], now);
    expect(store.node("t1", "eng")?.kind).toBe("person");
    expect(r.skipped.map((s) => s.address)).toEqual(["y"]);
    expect(readers(store, "t1", "B/y")).toEqual([]);
  });
});
