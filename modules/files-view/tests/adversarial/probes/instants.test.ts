import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { A, boot, ids, type World } from "../support/world.js";

let w: World;
beforeAll(async () => {
  w = await boot();
  await w.file("frac", { modified: "2026-03-01T10:00:00.700Z" });
  await w.file("dayonly", { modified: "2026-03-01" });
  await w.file("minute", { modified: "2026-03-01T10:00+00:00" });
  await w.file("offset", { modified: "2026-03-02T01:00:00+05:30" }); // 2026-03-01T19:30:00Z
  await w.file("late", { modified: "2026-03-01T22:00:00Z" });
  await w.file("junk", { modified: "yesterday" });
});
afterAll(() => w.close());
const list = async (q: string) => ids((await w.get(`/files?${q}`, A)).body).sort();

describe("modified compared as instants", () => {
  it("MEDIUM: `to` naming a second includes a file modified 700 ms into that second", async () => {
    expect(await list("from=2026-03-01T10:00:00Z&to=2026-03-01T10:00:00Z")).toEqual(["frac", "minute"]);
  });
  it("LOW: a date-only or minute-precision `modified` value is matched by an instant range", async () => {
    expect(await list("from=2026-03-01T00:00:00Z&to=2026-03-01T00:00:00Z")).toEqual(["dayonly"]);
  });
  it("LOW: `from` and `to` given with +05:30 select the same instant as the UTC form", async () => {
    expect(await list("from=2026-03-02T01:00:00%2B05:30&to=2026-03-02T01:00:00%2B05:30")).toEqual(["offset"]);
  });
  it("a file with an unparseable modified is never in a range, and never errors", async () => {
    expect(await list("from=1970-01-01&to=2100-01-01")).not.toContain("junk");
  });
});
