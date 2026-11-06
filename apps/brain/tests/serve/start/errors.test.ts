import { describe, expect, it } from "vitest";
import { isTransient } from "../../../src/serve/startup.js";

const coded = (code: string, message = "x") => Object.assign(new Error(message), { code });

// Transient means "the database may come back, keep retrying"; everything else is a mistake that retrying cannot fix.
describe("isTransient", () => {
  it.each(["08001", "08006", "57P01", "57P03", "ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "42P07"])("retries on %s", (code) => {
    expect(isTransient(coded(code))).toBe(true);
  });

  it("retries on the pool's own connect timeout and a connection cut mid-query, which carry no code", () => {
    expect(isTransient(new Error("timeout exceeded when trying to connect"))).toBe(true);
    expect(isTransient(new Error("Connection terminated unexpectedly"))).toBe(true);
  });

  it("looks through `cause`, because a wrapper error hides the connection error underneath", () => {
    expect(isTransient(new Error("migration failed", { cause: coded("ECONNREFUSED") }))).toBe(true);
  });

  it("is fatal for a wrong password, a syntax error and a plain bug", () => {
    expect(isTransient(coded("28P01", "password authentication failed"))).toBe(false);
    expect(isTransient(coded("42601"))).toBe(false);
    expect(isTransient(new Error("BRAIN_AUTH_SECRET too short"))).toBe(false);
    expect(isTransient("not an error")).toBe(false);
  });
});
