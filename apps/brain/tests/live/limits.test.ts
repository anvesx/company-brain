import type { GraphNode } from "@brain/graph-store";
import { describe, expect, it } from "vitest";
import { stillReadable } from "../../src/live/recheck.js";

const doc = (id: string) => ({ tenant: "t", id, kind: "document", source: "s", address: id, title: id, version: "1", props: {} }) as GraphNode;
const caller = { user: "u", tenant: "t" };
const never = () => new Promise<boolean>(() => {});
const limits = { perCheckMs: 20, totalMs: 200, top: 2 };

describe("live recheck limits", () => {
  it("hides a document whose check hangs and keeps the ones that answered", async () => {
    const check = (d: GraphNode) => (d.id === "slow" ? never() : Promise.resolve(true));
    const out = await stillReadable([doc("ok"), doc("slow")], caller, check, limits);
    expect(out.map((d) => d.id)).toEqual(["ok"]);
  });
  it("checks only the top documents and drops the rest", async () => {
    const asked: string[] = [];
    const check = async (d: GraphNode) => asked.push(d.id) > 0;
    const out = await stillReadable([doc("a"), doc("b"), doc("c")], caller, check, limits);
    expect(asked).toEqual(["a", "b"]);
    expect(out.map((d) => d.id)).toEqual(["a", "b"]);
  });
  it("hides everything unanswered when the total budget runs out", async () => {
    const out = await stillReadable([doc("a")], caller, never, { perCheckMs: 500, totalMs: 20, top: 5 });
    expect(out).toEqual([]);
  });
});
