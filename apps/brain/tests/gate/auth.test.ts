import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verify } from "../../src/gate/auth.js";

const SECRET = "s".repeat(32);
const sig = (m: string) => createHmac("sha256", SECRET).update(m).digest("hex");
const header = (user = "ann", tenant = "t", exp = 100) => `Bearer ${user}:${tenant}:${exp}:${sig(`${user}:${tenant}:${exp}`)}`;

describe("verify", () => {
  it("accepts a valid token and names the caller", () => {
    expect(verify(header(), SECRET, 50)).toEqual({ user: "ann", tenant: "t" });
  });
  it("rejects a token that expires exactly now", () => {
    expect(verify(header("ann", "t", 100), SECRET, 100)).toBeUndefined();
    expect(verify(header("ann", "t", 100), SECRET, 99)).toBeDefined();
  });
  it("rejects missing headers and text around the token", () => {
    expect(verify(undefined, SECRET, 0)).toBeUndefined();
    expect(verify("", SECRET, 0)).toBeUndefined();
    expect(verify(`x ${header()}`, SECRET, 0)).toBeUndefined();
    expect(verify(`${header()}0`, SECRET, 0)).toBeUndefined();
    expect(verify(`${header()} `, SECRET, 0)).toBeUndefined();
  });
  it("rejects a signature of the wrong length or case", () => {
    expect(verify(header().slice(0, -2), SECRET, 0)).toBeUndefined();
    expect(verify(header().toUpperCase().replace("BEARER", "Bearer"), SECRET, 0)).toBeUndefined();
  });
  it("rejects a token signed for another user or tenant", () => {
    const forged = header("ann", "t", 100).replace("ann:", "bob:");
    expect(verify(forged, SECRET, 0)).toBeUndefined();
    expect(verify(header("ann", "t", 100).replace(":t:", ":u:"), SECRET, 0)).toBeUndefined();
  });
});
