import { describe, expect, it } from "vitest";
import { edge, node } from "../support/helpers.js";
import { codeOf } from "../support/pg/async.js";
import { factories, openOn } from "../support/pg/factories.js";

/** 32 keys k00..k31, each value 125 bytes of mostly two-byte characters: exactly the 4096-byte total cap. */
const fullProps = (extra = ""): Record<string, string> =>
  Object.fromEntries(Array.from({ length: 32 }, (_, i) => [`k${String(i).padStart(2, "0")}`, `${"é".repeat(62)}a${i === 0 ? extra : ""}`]));

const UNICODE_TITLES = [
  "Ünïcödé — 日本語のタイトル",
  "family 👩‍👩‍👧‍👦 and flags 🇮🇳🇯🇵",
  "مرحبا بالعالم (right to left)",
  "é combining vs é precomposed",
  "😀".repeat(128), // exactly the 512-byte title cap in four-byte characters
];

// Size caps, unicode and lifecycle (spec graph-store, Behaviour 6, 8; spec deploy, Behaviour 4) on every dialect.
for (const f of factories)
  describe.skipIf(f.skip !== undefined)(`${f.name}: limits`, () => {
    it("props at every cap round-trip byte for byte", async () => {
      const s = await openOn(f);
      await s.upsertNode(node("full", { props: fullProps() }), 1);
      expect((await s.node("t1", "full"))?.props).toEqual(fullProps());
      await s.upsertNode(node("big", { props: { v: "x".repeat(1024) } }), 1);
      expect((await s.node("t1", "big"))?.props["v"]).toHaveLength(1024);
    });

    it("props one byte or one key over a cap reject BAD_INPUT and store nothing", async () => {
      const s = await openOn(f);
      const over = [fullProps("b"), { v: "x".repeat(1025) }, { ...fullProps(), k32: "x" }, { Body: "smuggled text" }];
      for (const props of over) expect(await codeOf(() => s.upsertNode(node("n", { props }), 1))).toBe("BAD_INPUT");
      expect(await s.history("t1", "n")).toEqual([]);
    });

    it("unicode titles and ids round-trip exactly, NFC and NFD stay distinct", async () => {
      const s = await openOn(f);
      for (const [i, title] of UNICODE_TITLES.entries()) await s.upsertNode(node(`докумéнт-日本-😀-${i}`, { title }), 1);
      for (const [i, title] of UNICODE_TITLES.entries()) expect((await s.node("t1", `докумéнт-日本-😀-${i}`))?.title).toBe(title);
      await s.upsertNode(node("é"), 1);
      expect(await s.node("t1", "é")).toBeUndefined();
      expect(await codeOf(() => s.upsertNode(node("x", { title: `${"😀".repeat(128)}a` }), 1))).toBe("BAD_INPUT");
    });

    it("ids that look like SQL or LIKE patterns are plain text", async () => {
      const s = await openOn(f);
      for (const id of ["a'b", "x; DROP TABLE nodes;--", "%", "_", "a\\b"]) await s.upsertNode(node(id), 1);
      expect((await s.node("t1", "%"))?.id).toBe("%");
      expect(await s.node("t1", "ab")).toBeUndefined();
      expect((await s.node("t1", "x; DROP TABLE nodes;--"))?.id).toBe("x; DROP TABLE nodes;--");
    });

    it("a NUL character or a lone surrogate in any text rejects BAD_INPUT on both dialects", async () => {
      const s = await openOn(f);
      const bad = [node("a\u0000b"), node("a", { tenant: "t\u0000" }), node("\ud800"), node("a", { title: "x\udc00" })];
      for (const n of bad) expect(await codeOf(() => s.upsertNode(n, 1))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.addEdge(edge("a", "b\u0000"), 1))).toBe("BAD_INPUT");
      expect(await codeOf(() => s.node("t1", "\ud800"))).toBe("BAD_INPUT");
    });

    it("after close every call rejects CLOSED", async () => {
      const s = await openOn(f);
      await s.close();
      expect(await codeOf(() => s.upsertNode(node("a"), 1))).toBe("CLOSED");
      expect(await codeOf(() => s.addEdge(edge("a", "b"), 1))).toBe("CLOSED");
      expect(await codeOf(() => s.node("t1", "a"))).toBe("CLOSED");
      expect(await codeOf(() => s.neighbors("t1", "a"))).toBe("CLOSED");
      expect(await codeOf(() => s.reach("t1", "a", { kinds: ["links-to"], depth: 1, limit: 1 }))).toBe("CLOSED");
      expect(await codeOf(() => s.history("t1", "a"))).toBe("CLOSED");
      expect(await codeOf(() => s.close())).toBe("CLOSED");
    });
  });
