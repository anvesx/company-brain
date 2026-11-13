import { describe, expect, it } from "vitest";
import { type Doc, stillReadable } from "../../src/live.js";

const doc = (id: string): Doc => ({ tenant: "t", id, kind: "document", source: "drive", address: id, title: id, version: "1", props: {} });
const caller = { tenant: "t", user: "u" };
const limits = { perCheckMs: 20, totalMs: 100, top: 2 };

describe("stillReadable", () => {
  it("hides all without a check, and a check that throws or hangs", async () => {
    expect(await stillReadable([doc("a")], caller)).toEqual([]);
    const boom = () => {
      throw new Error("down");
    };
    expect(await stillReadable([doc("a")], caller, boom)).toEqual([]);
    const hang = () => new Promise<boolean>(() => undefined);
    expect(await stillReadable([doc("a")], caller, hang, limits)).toEqual([]);
  });
  it("checks at most `top` documents and keeps those that answered yes", async () => {
    const out = await stillReadable([doc("a"), doc("b"), doc("c")], caller, async (d) => d.id !== "b", limits);
    expect(out.map((d) => d.id)).toEqual(["a"]);
  });
  it("hides everything when the whole list is late", async () => {
    const slow = () => new Promise<boolean>((ok) => setTimeout(() => ok(true), 60));
    expect(await stillReadable([doc("a")], caller, slow, { perCheckMs: 500, totalMs: 10, top: 2 })).toEqual([]);
  });
});
