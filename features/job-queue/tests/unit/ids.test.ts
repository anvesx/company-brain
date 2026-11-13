import { describe, expect, test } from "vitest";
import { dlqName, idempotentId } from "../../src/queue/ids.ts";

describe("idempotentId", () => {
  test("is a stable version-5-shaped uuid", () => {
    const id = idempotentId("q", "t", "k");
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(idempotentId("q", "t", "k")).toBe(id);
  });

  test("differs when queue, tenant or key differs", () => {
    const ids = new Set([idempotentId("q", "t", "k"), idempotentId("q2", "t", "k"), idempotentId("q", "t2", "k"), idempotentId("q", "t", "k2")]);
    expect(ids.size).toBe(4);
  });

  test("does not collide when parts shift between fields", () => {
    expect(idempotentId("ab", "c", "d")).not.toBe(idempotentId("a", "bc", "d"));
  });

  test("names the dead-letter queue after its source", () => {
    expect(dlqName("sync")).toBe("sync_dlq");
  });
});
