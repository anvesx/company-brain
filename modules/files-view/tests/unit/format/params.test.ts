import { describe, expect, it } from "vitest";
import { BadInput } from "../../../src/db/cursor.js";
import { LIST_KEYS, MAX_LIMIT, pageSize, parseList, strict } from "../../../src/http/params.js";

const q = (s: string) => new URLSearchParams(s);
describe("strict", () => {
  it("reads allowed names and drops empty values", () => expect(strict(q("q=hi&owner="), LIST_KEYS)).toEqual({ q: "hi" }));
  it.each(["x=1", "q=a&q=b", "parent=1", "q=a%00b", `q=${"a".repeat(101)}`, `owner=${"a".repeat(201)}`, `cursor=${"a".repeat(1025)}`])("rejects %s", (s) => {
    expect(() => strict(q(s), LIST_KEYS)).toThrow(BadInput);
  });
  it("accepts a long cursor and a 100-char search", () =>
    expect(Object.keys(strict(q(`q=${"a".repeat(100)}&cursor=${"a".repeat(1024)}`), LIST_KEYS))).toEqual(["q", "cursor"]));
});

describe("pageSize", () => {
  it("defaults to 25 and caps at the maximum", () => {
    expect(pageSize(undefined)).toBe(25);
    expect(pageSize("100")).toBe(100);
    expect(pageSize("999999")).toBe(MAX_LIMIT);
  });
  it.each(["0", "-1", "abc", "1.5", "1e3", "1234567", ""])("rejects %j", (v) => expect(() => pageSize(v)).toThrow(BadInput));
});

describe("parseList", () => {
  it("defaults to newest first, 25 rows", () => expect(parseList({}).query).toEqual({ sort: "modified", dir: "desc", limit: 25 }));
  it("sorts titles ascending unless told otherwise", () => {
    expect(parseList({ sort: "title" }).query.dir).toBe("asc");
    expect(parseList({ sort: "title", dir: "desc" }).query.dir).toBe("desc");
  });
  it("passes filters through and returns the cluster apart", () => {
    const r = parseList({ q: "a", source: "s", mime: "m", owner: "o", from: "2026-01-02", to: "2026-01-03", cursor: "c", cluster: "k" });
    expect(r.cluster).toBe("k");
    expect(r.query).toMatchObject({
      q: "a",
      source: "s",
      mime: "m",
      owner: "o",
      from: "2026-01-02T00:00:00.000Z",
      to: "2026-01-03T23:59:59.999Z",
      cursor: "c",
    });
    expect("cluster" in r.query).toBe(false);
  });
  it.each([["not-a-date"], ["2026-02-30"], ["2026-01-01T00:00"], ["2026-13-01"], ["1"]])("rejects date %s", (d) =>
    expect(() => parseList({ from: d })).toThrow(BadInput),
  );
  it("accepts an offset instant and normalises it to UTC", () =>
    expect(parseList({ from: "2026-01-01T02:00:00+02:00" }).query.from).toBe("2026-01-01T00:00:00.000Z"));
  it.each([[{ sort: "owner" }], [{ dir: "up" }], [{ sort: "size", dir: "" }]])("rejects %j", (p) => expect(() => parseList(p)).toThrow(BadInput));
});
