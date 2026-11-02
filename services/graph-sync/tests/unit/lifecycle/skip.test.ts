import { GraphError } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { SyncError } from "../../../src/index.js";
import { guarded, revoke } from "../../../src/write/skip.js";
import { setup } from "../../helpers.js";
import { ctxOf } from "../write/ctx.js";

const edge = (from: string, kind: "can-read" | "mentions", source = "folder") => ({ tenant: "t1", from, to: "d", kind, source }) as const;
const boom = (e: unknown) => () => {
  throw e;
};

describe("guarded", () => {
  it("records bad input and runs onSkip", () => {
    for (const e of [new SyncError("BAD_INPUT", "m1"), new GraphError("BAD_INPUT", "m1")]) {
      const c = ctxOf();
      let skipped = 0;
      guarded(c, "x", boom(e), () => skipped++);
      expect(c.report.skipped).toEqual([{ address: "x", message: "m1" }]);
      expect(skipped).toBe(1);
    }
  });

  it("rethrows everything else", () => {
    const plain = Object.assign(new Error("p"), { code: "BAD_INPUT" });
    for (const e of [new SyncError("ABORTED", "a"), new GraphError("CLOSED", "c"), plain]) {
      expect(() => guarded(ctxOf(), "x", boom(e))).toThrow(e.message);
    }
  });
});

describe("revoke", () => {
  it("drops only this connector's can-read in-edges", () => {
    const c = ctxOf();
    const { store } = c.deps;
    for (const e of [edge("a", "can-read"), edge("b", "can-read", "else"), edge("m", "mentions")]) store.addEdge(e, 1);
    store.addEdge({ ...edge("d", "can-read"), from: "d", to: "z" }, 1);
    revoke(c, "d");
    const left = store.neighbors("t1", "d", { dir: "in" }).map((e) => e.from);
    expect(left.sort()).toEqual(["b", "m"]);
    expect(store.neighbors("t1", "d", { dir: "out" })).toHaveLength(1);
  });

  it("swallows bad input and rethrows a closed store", () => {
    expect(() => revoke(ctxOf(setup("")), "d")).not.toThrow();
    const t = setup();
    t.store.close();
    expect(() => revoke(ctxOf(t), "d")).toThrow(GraphError);
  });
});
