import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  await w.bulk(3000, (i) => ({
    title: `doc ${i}`,
    props: { owner: "alice", zone: "company", mime: "text/plain", size: "1", modified: "2026-01-01T00:00:00Z" },
  }));
});
afterAll(() => w.close());

describe("source amplification", () => {
  it("MEDIUM: one /files request does not fan out to more than 2000 live rechecks of the source", async () => {
    let calls = 0;
    w.w.recheck = async () => {
      calls++;
      return false; // every file the graph allows is gone at the source
    };
    const r = await w.get("/files?limit=100", A);
    expect(r.status).toBe(200);
    expect(calls).toBeLessThanOrEqual(2000);
  }, 60_000);
});
