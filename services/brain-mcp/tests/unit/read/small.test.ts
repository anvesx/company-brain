import { toAsync } from "@anvesx/graph-store";
import { afterAll, describe, expect, it } from "vitest";
import { inChunks } from "../../../src/access/par.js";
import { connectors } from "../../../src/tools/read/connectors.js";
import { tempStore } from "../../support/graph.js";

const store = tempStore();
afterAll(() => store.close());
const list = (rows: Record<string, unknown>[]) => connectors({ store: toAsync(store), caller: { tenant: "t", user: "u" }, accounts: async () => rows });

describe("brain.connectors", () => {
  it("renders linkedAt for epoch ms, ISO string and Date, and leaves it out for anything else", async () => {
    const at = "2024-05-01T00:00:00.000Z";
    const rows = [
      { providerId: "num", createdAt: Date.parse(at) },
      { providerId: "str", createdAt: at },
      { providerId: "date", createdAt: new Date(at) },
      ...[null, true, {}, "not a date", undefined].map((createdAt, i) => ({ providerId: `bad${i}`, createdAt })), // null and true would be valid Dates if coerced
      { providerId: "missing" },
    ];
    const { providers } = await list(rows);
    expect(providers.slice(0, 3).map((p) => p.linkedAt)).toEqual([at, at, at]);
    for (const p of providers.slice(3)) expect(p, p.id).toStrictEqual({ id: p.id, status: "active" }); // no linkedAt key at all
  });

  it("skips the sign-in credential row and rows without a string provider id, and marks the rest active", async () => {
    const { providers } = await list([{ providerId: "credential", createdAt: 1 }, { providerId: 7 }, {}, { providerId: "github", accessToken: "secret" }]);
    expect(providers).toStrictEqual([{ id: "github", status: "active" }]); // no token leaks out
  });

  it("lists at most 100 providers, the first 100", async () => {
    const { providers } = await list(Array.from({ length: 105 }, (_, i) => ({ providerId: `p${i}` })));
    expect(providers.map((p) => p.id)).toEqual(Array.from({ length: 100 }, (_, i) => `p${i}`));
  });
});

describe("inChunks", () => {
  it("runs 32 at a time, one chunk after another, and returns results in input order", async () => {
    let live = 0;
    let peak = 0;
    const calls: number[] = [];
    const out = await inChunks(
      Array.from({ length: 70 }, (_, i) => i),
      async (n) => {
        calls.push(n);
        peak = Math.max(peak, ++live);
        await new Promise((r) => setTimeout(r, 1)); // yield so the whole chunk is in flight together
        live--;
        return n * 2;
      },
    );
    expect(peak).toBe(32); // chunk size respected, not all 70 at once
    expect(calls).toEqual(Array.from({ length: 70 }, (_, i) => i)); // each item once, in order
    expect(out).toEqual(Array.from({ length: 70 }, (_, i) => i * 2));
  });

  it("honours an explicit size", async () => {
    let live = 0;
    let peak = 0;
    await inChunks(
      [1, 2, 3, 4, 5, 6, 7],
      async () => {
        peak = Math.max(peak, ++live);
        await new Promise((r) => setTimeout(r, 1));
        live--;
      },
      3,
    );
    expect(peak).toBe(3);
  });
});
