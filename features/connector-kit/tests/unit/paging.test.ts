import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { ConnectorError, createFakeConnector, type FakeDoc } from "../../src/index.js";

const doc = (address: string): FakeDoc => ({
  address,
  title: address,
  text: `text:${address}`,
  version: "1",
  acl: { allowUsers: [], allowGroups: [], version: 0 },
  zone: "team",
  updatedAt: "2026-11-01T00:00:00.000Z",
});

describe("fake connector paging", () => {
  it("returns every doc exactly once for every limit 1..1000", async () => {
    await fc.assert(fc.asyncProperty(
      fc.uniqueArray(fc.string({ minLength: 1, maxLength: 24 }), { selector: String, maxLength: 200 }),
      fc.integer({ min: 1, max: 1000 }),
      async (addresses, limit) => {
        const connector = createFakeConnector("fake", addresses.map(doc));
        const seen: string[] = [];
        let cursor: string | undefined;
        do {
          const page = await connector.list(cursor === undefined ? { limit } : { limit, cursor });
          seen.push(...page.items.map((item) => item.address));
          cursor = page.nextCursor;
        } while (cursor !== undefined);
        expect(seen).toEqual(addresses);
        expect(new Set(seen).size).toBe(addresses.length);
      },
    ), { numRuns: 100 });
  });

  it.each([0, -1, 1001])("rejects invalid limit %i", async (limit) => {
    await expect(createFakeConnector("fake", [doc("a")]).list({ limit })).rejects.toThrow(RangeError);
  });

  it.each(["", "x", "-1", "2", "01"])("rejects bad cursor %j", async (cursor) => {
    const result = createFakeConnector("fake", [doc("a")]).list({ limit: 1, cursor });
    await expect(result).rejects.toMatchObject({ code: "BAD_CURSOR" });
  });

  it("fetches live fake text and rejects missing addresses", async () => {
    const connector = createFakeConnector("fake", [doc("文档")]);
    await expect(connector.fetch("文档", { token: "user" })).resolves.toEqual({ text: "text:文档", version: "1" });
    await expect(connector.fetch("missing", { token: "user" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects duplicate addresses and snapshots caller-owned input", async () => {
    const first = doc("a");
    expect(() => createFakeConnector("fake", [first, doc("a")])).toThrowError(ConnectorError);
    const connector = createFakeConnector("fake", [first]);
    first.text = "changed outside";
    await expect(connector.fetch("a", { token: "user" })).resolves.toMatchObject({ text: "text:a" });
  });
});
