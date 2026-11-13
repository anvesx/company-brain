import { describe, expect, it } from "vitest";
import { BadInput, decode, encode } from "../../../src/db/cursor.js";

const order = "modified:desc";
const enc = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
describe("keyset cursor", () => {
  it("round-trips and is URL-safe base64", () => {
    const c = { o: order, k: "1767225600000", i: "f/1 é" };
    const raw = encode(c);
    expect(raw).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decode(raw, order)).toEqual(c);
  });
  it("is opaque: the plain key does not appear in it", () => expect(encode({ o: order, k: "secret-key", i: "id" })).not.toContain("secret"));
  it("accepts a numeric key for size orders", () => expect(decode(enc({ o: "size:asc", k: "123", i: "a" }), "size:asc").k).toBe("123"));
  it("accepts a negative instant for modified orders (before 1970)", () =>
    expect(decode(enc({ o: order, k: "-86400000", i: "a" }), order).k).toBe("-86400000"));
  const bad: [string, string][] = [
    ["empty", ""],
    ["not base64url chars", "a+b/c="],
    ["too long", "a".repeat(1025)],
    ["not json", Buffer.from("{oops").toString("base64url")],
    ["json null", enc(null)],
    ["json number", enc(7)],
    ["wrong order", enc({ o: "title:asc", k: "k", i: "i" })],
    ["missing id", enc({ o: order, k: "k" })],
    ["empty id", enc({ o: order, k: "k", i: "" })],
    ["key not a string", enc({ o: order, k: 5, i: "i" })],
    ["NUL in key", enc({ o: order, k: "a\u0000b", i: "i" })],
    ["modified key not an instant", enc({ o: order, k: "2026-01-01", i: "i" })],
    ["size key not digits", enc({ o: "size:asc", k: "12abc", i: "i" })],
    ["size key too long", enc({ o: "size:asc", k: "1".repeat(19), i: "i" })],
  ];
  it.each(bad)("rejects %s with BadInput", (_n, raw) => expect(() => decode(raw, raw.startsWith("size") ? "size:asc" : order)).toThrow(BadInput));
  it("a cursor made for one order is refused under another", () =>
    expect(() => decode(encode({ o: "title:asc", k: "a", i: "b" }), "title:desc")).toThrow(BadInput));
});
