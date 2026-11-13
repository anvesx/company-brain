import { describe, expect, it } from "vitest";
import { age, formatDate, formatSize, href } from "../../../src/ui/format.js";

describe("formatSize", () => {
  it.each([
    [0, "0 B"],
    [1023, "1023 B"],
    [1024, "1.0 KB"],
    [1536, "1.5 KB"],
    [5 * 1024 ** 2, "5.0 MB"],
    [1024 ** 4 * 3, "3.0 TB"],
    [1024 ** 6, "1048576.0 TB"],
  ])("%d -> %s", (n, out) => expect(formatSize(n)).toBe(out));
  it.each([Number.NaN, -1, Number.POSITIVE_INFINITY])("renders %s as a dash", (n) => expect(formatSize(n)).toBe("—"));
});

describe("formatDate", () => {
  it("renders ISO as UTC minutes", () => expect(formatDate("2026-11-13T09:30:59Z")).toBe("2026-11-13 09:30 UTC"));
  it("converts offsets to UTC", () => expect(formatDate("2026-11-13T09:30:00+05:30")).toBe("2026-11-13 04:00 UTC"));
  it("returns unparseable text unchanged", () => expect(formatDate("not a date")).toBe("not a date"));
});

describe("age", () => {
  const now = Date.parse("2026-11-13T12:00:00Z");
  const at = (s: number) => new Date(now - s * 1000).toISOString();
  it.each([
    [5, "just now"],
    [120, "2 min ago"],
    [7200, "2 h ago"],
    [3 * 86400, "3 days ago"],
    [-60, "just now"],
  ])("%d s ago -> %s", (s, out) => expect(age(at(s), now)).toBe(out));
  it("passes junk through", () => expect(age("junk", now)).toBe("junk"));
});

describe("href", () => {
  it("keeps the query, overrides keys and drops the cursor", () => {
    expect(href("/files", { q: "a b", sort: "size", cursor: "old" }, { dir: "asc" })).toBe("/files?q=a+b&sort=size&dir=asc");
  });
  it("adds a cursor only when given and returns the bare path with no query", () => {
    expect(href("/files", {}, { cursor: "abc" })).toBe("/files?cursor=abc");
    expect(href("/clusters/x", {})).toBe("/clusters/x");
  });
});
