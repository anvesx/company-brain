import { describe, expect, it } from "vitest";
import { A, B, boom, seeded, setup, T, v2 } from "../support/harness.js";

describe("index and event failures", () => {
  it("index remove failure restores the old pointer, chunks intact", async () => {
    const env = await seeded({});
    const bad = {
      ...env.index,
      remove: () => {
        throw new Error("disk");
      },
    };
    const svc = setup(T, { registry: env.registry, index: bad }).svc;
    await expect(svc.apply({ type: "upsert", pointer: v2 })).rejects.toMatchObject({ code: "INDEX_FAILED" });
    expect(env.registry.get("acme", "d1")?.version).toBe("v1");
    expect(env.has("acme", "d1", A)).toBe(true);
  });

  it("index add failure unindexes the doc consistently so replay retries", async () => {
    const env = await seeded({});
    const bad = {
      ...env.index,
      add: () => {
        throw new Error("disk");
      },
    };
    const svc = setup(T, { registry: env.registry, index: bad }).svc;
    await expect(svc.apply({ type: "upsert", pointer: v2 })).rejects.toMatchObject({ code: "INDEX_FAILED" });
    expect(env.registry.get("acme", "d1")).toBeUndefined();
    expect(env.count("acme")).toBe(0);
    const ok = setup(T, { registry: env.registry, index: env.index });
    expect((await ok.svc.apply({ type: "upsert", pointer: v2 })).outcome).toBe("updated");
    expect(env.has("acme", "d1", B)).toBe(true);
  });

  it("add failure plus failed cleanup throws CLEANUP_FAILED carrying both errors", async () => {
    const env = await seeded({});
    let n = 0;
    const fail = (m: string) => () => {
      throw new Error(m);
    };
    const remove = () => (++n > 1 ? fail("cleanup")() : 0);
    const svc = setup(T, { registry: env.registry, index: { ...env.index, remove, add: fail("add") } }).svc;
    const err = await svc.apply({ type: "upsert", pointer: v2 }).catch((e) => e);
    expect(err).toMatchObject({ name: "IndexServiceError", code: "CLEANUP_FAILED" });
    expect(err.cause).toBeInstanceOf(AggregateError);
    expect(err.cause.errors.map((e: Error) => e.message)).toEqual(["add", "cleanup"]);
  });

  it("failed rollback is reported as ROLLBACK_FAILED", async () => {
    const env = await seeded({});
    let n = 0;
    const registry = {
      ...env.registry,
      get: env.registry.get,
      upsert: (p: Parameters<typeof env.registry.upsert>[0]) => {
        if (++n > 1) throw new Error("db gone");
        return env.registry.upsert(p);
      },
    };
    const svc = setup(T, { registry, index: env.index, embed: boom }).svc;
    await expect(svc.apply({ type: "upsert", pointer: v2 })).rejects.toMatchObject({
      code: "ROLLBACK_FAILED",
    });
  });

  it("invalid events throw INVALID_EVENT", async () => {
    const { svc } = setup(T);
    const bad = [
      null,
      { type: "nope" },
      { type: "upsert", pointer: { id: "x" } },
      { type: "upsert" },
      { type: "delete", tenantId: "", id: "d", at: "x" },
      { type: "delete", tenantId: "acme", id: "d", at: "not-a-date" },
    ];
    for (const e of bad) await expect(svc.apply(e as never)).rejects.toMatchObject({ code: "INVALID_EVENT" });
  });
});
