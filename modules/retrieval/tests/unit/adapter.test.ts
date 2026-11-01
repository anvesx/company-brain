import type { Principal } from "@brain/core-types";
import { QueryError } from "@brain/query-service";
import { describe, expect, it, vi } from "vitest";
import { toSearchFn } from "../../src/adapter.js";

const principal: Principal = { id: "alice", tenantId: "t1", groups: [] };
const make = (search = vi.fn(() => []), embedQuery = vi.fn(async (_t: string) => [1, 0])) => ({
  search,
  embedQuery,
  fn: toSearchFn({ search }, embedQuery),
});

describe("toSearchFn", () => {
  it("embeds the query text and forwards query, principal, limit and embedding", async () => {
    const m = make();
    await m.fn({ query: "hello", limit: 7, principal });
    expect(m.embedQuery).toHaveBeenCalledWith("hello");
    expect(m.search).toHaveBeenCalledWith({ query: "hello", principal, limit: 7, embedding: [1, 0] });
  });

  it("accepts a synchronous embedQuery", async () => {
    const m = make(
      vi.fn(() => []),
      vi.fn(() => [0, 1]) as never,
    );
    await m.fn({ query: "q", limit: 1, principal });
    expect(m.search).toHaveBeenCalledWith(expect.objectContaining({ embedding: [0, 1] }));
  });

  it("rejects without searching when embedQuery fails", async () => {
    const m = make(
      vi.fn(() => []),
      vi.fn(async () => {
        throw new Error("down");
      }),
    );
    await expect(m.fn({ query: "q", limit: 1, principal })).rejects.toThrow("down");
    expect(m.search).not.toHaveBeenCalled();
  });

  it("rejects when the query service throws instead of throwing synchronously", async () => {
    const m = make(
      vi.fn(() => {
        throw new QueryError("BACKEND");
      }),
    );
    await expect(m.fn({ query: "q", limit: 1, principal })).rejects.toBeInstanceOf(QueryError);
  });

  it("returns the service's pointers unchanged", async () => {
    const pointers = [{ id: "x" }] as never;
    const m = make(vi.fn(() => pointers));
    await expect(m.fn({ query: "q", limit: 1, principal })).resolves.toBe(pointers);
  });
});
