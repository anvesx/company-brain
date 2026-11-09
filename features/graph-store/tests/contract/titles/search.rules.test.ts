import { describe, expect, it } from "vitest";
import { node } from "../../support/helpers.js";
import { codeOf } from "../../support/pg/async.js";
import { type AsyncStore, factories, openOn } from "../../support/pg/factories.js";

// More searchTitles rules on every dialect: the read-edge gate, id order and input checks.
const ids = async (s: AsyncStore, text: string, more: Record<string, unknown> = {}) =>
  (await s.searchTitles("t1", { text, limit: 50, ...more })).map((n) => n.id);

for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: searchTitles rules`, () => {
    const seeded = async () => {
      const s = await openOn(f);
      for (const [id, title] of [
        ["a6", "QUARTERLY Plan"],
        ["a8", "quarterly review"],
      ] as const)
        await s.upsertNode(node(id, { title }), 10);
      return s;
    };

    it("gates one kind by a read edge with reachedBy", async () => {
      const s = await seeded();
      await s.upsertNode(node("p1", { kind: "person", title: "quarterly person" }), 10);
      await s.addEdge({ tenant: "t1", from: "u1", to: "a6", kind: "can-read", source: "x" }, 10);
      const reachedBy = { from: ["u1"], kind: "can-read", only: "document" };
      expect(await ids(s, "quarterly", { reachedBy })).toEqual(["a6", "p1"]);
    });

    it("orders ids by code unit, not by locale", async () => {
      const s = await openOn(f);
      for (const id of ["b", "B", "a", "_x"]) await s.upsertNode(node(id, { title: "same" }), 1);
      expect(await ids(s, "same")).toEqual(["B", "_x", "a", "b"]);
    });

    it("rejects bad text, limit and kinds with BAD_INPUT", async () => {
      const s = await seeded();
      expect(await codeOf(() => s.searchTitles("t1", { text: "", limit: 5 }))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.searchTitles("t1", { text: "x".repeat(513), limit: 5 }))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.searchTitles("t1", { text: "a\u0000b", limit: 5 }))).toBe("BAD_INPUT");
      for (const limit of [0, 1001, 2.5]) expect(await codeOf(() => s.searchTitles("t1", { text: "a", limit }))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.searchTitles("t1", { text: "a", limit: 5, kinds: ["secret" as never] }))).toBe("BAD_INPUT");
      await s.close();
      expect(await codeOf(() => s.searchTitles("t1", { text: "a", limit: 5 }))).toBe("CLOSED");
    });
  });
