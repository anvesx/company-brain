import { describe, expect, it } from "vitest";
import { createFakeConnector, type FakeDoc } from "../../src/index.js";

const doc = (address: string): FakeDoc => ({
  address, title: address, text: address, version: "1",
  acl: { allowUsers: [], allowGroups: [], version: 0 },
  zone: "team", updatedAt: "2026-11-01T00:00:00.000Z",
});
const three = () => createFakeConnector("f", [doc("a"), doc("b"), doc("c")]);

describe("paging validation", () => {
  it.each([1, 1000])("accepts boundary limit %i", async (limit) => {
    const page = await three().list({ limit });
    expect(page.items.length).toBe(Math.min(limit, 3));
  });

  it.each([1.5, Number.NaN, Number.POSITIVE_INFINITY, 1001])("rejects limit %s", async (limit) => {
    await expect(three().list({ limit })).rejects.toThrow(RangeError);
  });

  it.each(["0", "3", "4", "1.5", " 1", "1e1", "9007199254740993", "-0"])(
    "rejects cursor %j", async (cursor) => {
      await expect(three().list({ limit: 1, cursor })).rejects.toMatchObject({ code: "BAD_CURSOR" });
    });

  it("emits a cursor only while docs remain and resumes at it", async () => {
    const first = await three().list({ limit: 2 });
    expect(first.nextCursor).toBe("2");
    const last = await three().list({ limit: 2, cursor: "2" });
    expect(last).toEqual({ items: [expect.objectContaining({ address: "c" })] });
    expect(await createFakeConnector("e", []).list({ limit: 5 })).toEqual({ items: [] });
  });

  it("does not leak text into listings", async () => {
    const page = await three().list({ limit: 1 });
    expect(page.items[0]).not.toHaveProperty("text");
  });

  it("rejects a megabyte-long cursor quickly", async () => {
    const start = Date.now();
    await expect(three().list({ limit: 1, cursor: `1${"9".repeat(1_000_000)}x` }))
      .rejects.toMatchObject({ code: "BAD_CURSOR" });
    expect(Date.now() - start).toBeLessThan(500);
  });
});
