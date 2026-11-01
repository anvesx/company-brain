import { describe, expect, it } from "vitest";
import { doc, failingOn, firstPageCursor, five, setup, tmpDb, withSink } from "../helpers.js";

describe("resume and change detection", () => {
  it("modified file emits exactly one event", async () => {
    const dbPath = tmpDb();
    await setup(five, dbPath).runtime.runOnce("t1");
    const changed = five.map((d) => (d.address === "c" ? doc("c", "v2") : d));
    const second = setup(changed, dbPath);
    await second.runtime.runOnce("t1");
    expect(second.events.map((e) => `${e.address}@${e.version}`)).toEqual(["c@v2"]);
  });

  it("crash mid-run: a fresh runtime on the same db resumes with no duplicates and none lost", async () => {
    const dbPath = tmpDb();
    const delivered: string[] = [];
    const crashing = withSink(
      setup(five, dbPath),
      failingOn("d", delivered, () => true),
    );
    await expect(crashing.runOnce("t1")).rejects.toThrow();
    const resumed = setup(five, dbPath);
    await resumed.runtime.runOnce("t1");
    expect([...delivered, ...resumed.events.map((e) => e.address)]).toEqual(["a", "b", "c", "d", "e"]);
    expect(resumed.cursors.getCursor("t1", "fake")).toBe("");
  });

  it("resume starts at the persisted cursor, not at the beginning", async () => {
    const dbPath = tmpDb();
    const crashing = withSink(
      setup(five, dbPath),
      failingOn("c", [], () => true),
    );
    await expect(crashing.runOnce("t1")).rejects.toThrow();
    const second = setup(five, dbPath);
    const expected = await firstPageCursor(second.connector);
    const requested: Array<string | undefined> = [];
    const list = second.connector.list.bind(second.connector);
    second.connector.list = async (q) => {
      requested.push(q.cursor);
      return list(q);
    };
    await second.runtime.runOnce("t1");
    expect(requested[0]).toBe(expected);
  });
});
