import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, ids, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  await w.file("exact", { modified: "2026-03-01T10:00:00Z" });
  await w.file("offset", { modified: "2026-03-02T01:00:00+05:30" }); // 2026-03-01T19:30:00Z
  await w.file("later", { modified: "2026-03-05T00:00:00Z" });
});
afterAll(() => w.close());

describe("modified range boundaries", () => {
  it("MEDIUM: `to` is inclusive of a file modified at exactly that second", async () => {
    expect(ids((await w.get("/files?to=2026-03-01T10:00:00Z", A)).body)).toContain("exact");
  });
  it("MEDIUM: `from` and `to` on the same second return the file modified at that second", async () => {
    expect(ids((await w.get("/files?from=2026-03-01T10:00:00Z&to=2026-03-01T10:00:00Z", A)).body)).toEqual(["exact"]);
  });
  it("LOW: a file whose modified carries a +05:30 offset is compared as an instant, not as text", async () => {
    expect(ids((await w.get("/files?to=2026-03-01", A)).body).sort()).toEqual(["exact", "offset"]);
  });
});
