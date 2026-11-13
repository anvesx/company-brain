import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, ids, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
});
afterAll(() => w.close());

describe("ordering and search match the instants and letters a person means", () => {
  it("MEDIUM: sort=modified orders by instant, not by ISO text (offsets and fractions)", async () => {
    // instants: p (Dec 31 19:30Z) < q (00:00:00Z) < r (00:00:00.500Z) < s (00:00:01Z)
    await w.file("p", { modified: "2026-01-01T01:00:00+05:30" });
    await w.file("q", { modified: "2026-01-01T00:00:00Z" });
    await w.file("r", { modified: "2026-01-01T00:00:00.500Z" });
    await w.file("s", { modified: "2026-01-01T00:00:01Z" });
    const asc = ids((await w.get("/files?sort=modified&dir=asc", A)).body);
    expect(asc).toEqual(["p", "q", "r", "s"]);
    const desc = ids((await w.get("/files?sort=modified&dir=desc", A)).body);
    expect(desc).toEqual(["s", "r", "q", "p"]);
  });

  it("LOW: search is case-insensitive beyond ASCII (Élan is found by 'élan')", async () => {
    await w.file("u1", { title: "Élan report" });
    await w.file("u2", { title: "Straße plan" });
    expect(ids((await w.get("/files?q=%C3%A9lan", A)).body)).toContain("u1");
    expect(ids((await w.get("/files?q=%C3%89LAN", A)).body)).toContain("u1");
  });
});
