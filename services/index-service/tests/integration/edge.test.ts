import { describe, expect, it } from "vitest";
import { pointer, setup } from "../support/harness.js";

const A = "alpha beta gamma";
const B = "delta epsilon zeta";
const T = { "acme/d1@v1": A, "acme/d1@v2": B };
const v2 = () => pointer({ version: "v2", contentHash: "b".repeat(64) });

describe("apply edge cases", () => {
  it("empty text indexes zero chunks and clears old ones", async () => {
    const { svc, count } = setup({ ...T, "acme/d1@v2": "  " });
    await svc.apply({ type: "upsert", pointer: pointer() });
    const r = await svc.apply({ type: "upsert", pointer: v2() });
    expect(r).toEqual({ outcome: "updated", chunks: 0 });
    expect(count("acme")).toBe(0);
  });

  it("multi-chunk documents index every chunk", async () => {
    const long = "word ".repeat(60);
    const { svc, count } = setup({ "acme/d1@v1": long });
    const r = await svc.apply({ type: "upsert", pointer: pointer() });
    expect(r.chunks).toBeGreaterThan(3);
    expect(count("acme")).toBe(r.chunks);
  });

  it("ACL change reindexes the ACL columns", async () => {
    const { svc, has } = setup(T);
    await svc.apply({ type: "upsert", pointer: pointer() });
    const acl = { allowUsers: ["u2"], allowGroups: ["g1"], version: 2 };
    const r = await svc.apply({ type: "upsert", pointer: pointer({ acl }) });
    expect(r.outcome).toBe("updated");
    expect(has("acme", "d1", A, "u1")).toBe(false);
    expect(has("acme", "d1", A, "u2")).toBe(true);
  });

  it("concurrent applies for one doc serialize in arrival order", async () => {
    const { svc, has, count } = setup(T);
    await Promise.all([svc.apply({ type: "upsert", pointer: pointer() }), svc.apply({ type: "upsert", pointer: v2() })]);
    expect(has("acme", "d1", B)).toBe(true);
    expect(count("acme")).toBe(1);
  });
});
