import { describe, expect, it } from "vitest";
import { failingOn, firstPageCursor, five, setup, withSink } from "../helpers.js";

describe("sink failure", () => {
  it("keeps the cursor at the last good page and retries the item, not losing it", async () => {
    const s = setup(five);
    let fail = true;
    const delivered: string[] = [];
    const rt = withSink(
      s,
      failingOn("c", delivered, () => fail),
    );
    await expect(rt.runOnce("t1")).rejects.toMatchObject({ code: "SINK_FAILED" });
    expect(s.cursors.getCursor("t1", "fake")).toBe(await firstPageCursor(s.connector));
    expect(delivered).toEqual(["a", "b"]);
    fail = false;
    await rt.runOnce("t1");
    expect(delivered).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("on the first page leaves no cursor", async () => {
    const s = setup(five);
    const rt = withSink(
      s,
      failingOn("a", [], () => true),
    );
    await expect(rt.runOnce("t1")).rejects.toMatchObject({ code: "SINK_FAILED" });
    expect(s.cursors.getCursor("t1", "fake") ?? "").toBe("");
  });

  it("async rejection is also SINK_FAILED and keeps the cause", async () => {
    const cause = new Error("async boom");
    const rt = withSink(setup(five), async () => {
      throw cause;
    });
    await expect(rt.runOnce("t1")).rejects.toMatchObject({ code: "SINK_FAILED", cause });
  });
});
