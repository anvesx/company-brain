import { describe, expect, it } from "vitest";
import { createGraphStore, GraphError } from "../../../src/index.js";
import { withEnv } from "../../support/env.js";
import { code, edge, node, openStore, tmpDir } from "../../support/helpers.js";

describe("lifecycle", () => {
  it("throws CLOSED from every method after close, and close is not repeatable", () => {
    const s = openStore();
    s.close();
    const calls: (() => unknown)[] = [
      () => s.upsertNode(node("a"), 1),
      () => s.addEdge(edge("a", "b"), 1),
      () => s.removeEdge(edge("a", "b"), 1),
      () => s.tombstone("t1", "a", 1),
      () => s.node("t1", "a"),
      () => s.neighbors("t1", "a"),
      () => s.reach("t1", "a", { kinds: [], depth: 1, limit: 1 }),
      () => s.history("t1", "a"),
      () => s.close(),
    ];
    for (const c of calls) expect(code(c)).toBe("CLOSED");
  });
  it("GraphError carries code and name", () => {
    const e = new GraphError("DEPTH_LIMIT", "m");
    expect(e).toBeInstanceOf(Error);
    expect([e.code, e.name, e.message]).toEqual(["DEPTH_LIMIT", "GraphError", "m"]);
  });
  it("refuses :memory: outside tests but allows it in tests", () => {
    const mem = () => createGraphStore({ path: ":memory:" });
    withEnv({ NODE_ENV: "production", VITEST: undefined }, () => expect(code(mem)).toBe("BAD_INPUT"));
    withEnv({ NODE_ENV: "test", VITEST: undefined }, () => mem().close());
    withEnv({ NODE_ENV: "production", VITEST: "true" }, () => mem().close());
  });
  it("rejects a missing or empty path", () => {
    expect(code(() => createGraphStore({ path: "" }))).toBe("BAD_INPUT");
    expect(code(() => createGraphStore(undefined as never))).toBe("BAD_INPUT");
    expect(tmpDir()).toBeTruthy();
  });
});
