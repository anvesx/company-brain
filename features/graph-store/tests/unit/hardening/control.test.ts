import { describe, expect, it } from "vitest";
import { code, node, openStore } from "../../support/helpers.js";

// D4: a control character in the search text used to reach SQLite raw. "\u0000abc" raised
// "unterminated string" (INTERNAL) and "\u0000" alone matched every title. Now both are BAD_INPUT.
describe("searchTitles control characters", () => {
  it.each(["\u0000abc", "\u0000", "a\u0000b", "a\tb", "a\nb", "ab\u001fc", "abc\u007f"])("refuses %j", (text) => {
    const s = openStore();
    s.upsertNode(node("a1", { title: "abc report" }), 10);
    expect(code(() => s.searchTitles("t1", { text, limit: 5 }))).toBe("BAD_INPUT");
  });

  it("still accepts ordinary and unicode text", () => {
    const s = openStore();
    s.upsertNode(node("a1", { title: "日本 roadmap" }), 10);
    expect(s.searchTitles("t1", { text: "日本", limit: 5 })).toHaveLength(1);
  });
});
