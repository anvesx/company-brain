import { describe, expect, it } from "vitest";
import { code, node, openStore } from "../../support/helpers.js";

// searchTitles: a substring match over current titles in one tenant, ordered by id, paged by keyset.
// `%`, `_` and `\` in the text are literal characters, never LIKE wildcards.
const seeded = () => {
  const s = openStore();
  const titles: [string, string][] = [
    ["a1", "Budget 50% cut"],
    ["a2", "Budget 500 cut"],
    ["a3", "a_b notes"],
    ["a4", "axb notes"],
    ["a5", "back\\slash path"],
    ["a6", "QUARTERLY Plan"],
    ["a7", "日本 roadmap"],
    ["a8", "quarterly review"],
  ];
  for (const [id, title] of titles) s.upsertNode(node(id, { title }), 10);
  return s;
};
const ids = (s: ReturnType<typeof openStore>, text: string, more: Record<string, unknown> = {}) =>
  s.searchTitles("t1", { text, limit: 50, ...more }).map((n) => n.id);

describe("searchTitles", () => {
  it("treats % and _ as literal characters", () => {
    const s = seeded();
    expect(ids(s, "50%")).toEqual(["a1"]);
    expect(ids(s, "a_b")).toEqual(["a3"]);
    expect(ids(s, "%")).toEqual(["a1"]);
    expect(ids(s, "_")).toEqual(["a3"]);
  });

  it("treats a backslash as a literal character", () => {
    expect(ids(seeded(), "k\\s")).toEqual(["a5"]);
  });

  it("matches ASCII case-insensitively and unicode as written", () => {
    const s = seeded();
    expect(ids(s, "quarterly")).toEqual(["a6", "a8"]);
    expect(ids(s, "日本")).toEqual(["a7"]);
  });

  it("filters by kind and pages by id after a cursor", () => {
    const s = seeded();
    s.upsertNode(node("a9", { title: "quarterly team", kind: "team" }), 10);
    expect(ids(s, "quarterly", { kinds: ["team"] })).toEqual(["a9"]);
    expect(ids(s, "quarterly", { limit: 1 })).toEqual(["a6"]);
    expect(ids(s, "quarterly", { limit: 1, after: "a6" })).toEqual(["a8"]);
    expect(ids(s, "quarterly", { after: "a9" })).toEqual([]);
  });

  it("returns whole nodes, current version only, and skips tombstones", () => {
    const s = seeded();
    s.upsertNode(node("a6", { title: "annual plan" }), 20);
    s.tombstone("t1", "a8", 20);
    expect(ids(s, "quarterly")).toEqual([]);
    expect(s.searchTitles("t1", { text: "annual", limit: 5 })).toEqual([node("a6", { title: "annual plan" })]);
  });

  it("reads titles as they were at asOf", () => {
    const s = seeded();
    s.upsertNode(node("a6", { title: "annual plan" }), 20);
    expect(ids(s, "quarterly", { asOf: 15 })).toEqual(["a6", "a8"]);
    expect(ids(s, "annual", { asOf: 15 })).toEqual([]);
  });

  it("never crosses tenants", () => {
    const s = seeded();
    s.upsertNode(node("b1", { tenant: "t2", title: "quarterly other" }), 10);
    expect(ids(s, "other")).toEqual([]);
  });

  it("rejects empty or oversize text and a limit outside 1..1000 with BAD_INPUT", () => {
    const s = seeded();
    expect(code(() => s.searchTitles("t1", { text: "", limit: 5 }))).toBe("BAD_INPUT");
    expect(code(() => s.searchTitles("t1", { text: "x".repeat(513), limit: 5 }))).toBe("BAD_INPUT");
    for (const limit of [0, 1001, 2.5]) expect(code(() => s.searchTitles("t1", { text: "a", limit }))).toBe("BAD_INPUT");
    expect(code(() => s.searchTitles("t1", { text: "a", limit: 5, kinds: ["secret" as never] }))).toBe("BAD_INPUT");
  });
});
