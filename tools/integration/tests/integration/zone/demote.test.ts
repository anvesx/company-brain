import type { Zone } from "@anvesx/zone-policy";
import { describe, expect, it } from "vitest";
import { zoneGate } from "../../../src/zone-gate.js";
import { put, stack } from "../../support/world.js";

const ana = { user: "ana", teams: ["eng"] };
const eve = { user: "eve", teams: ["ops"] };
const company: Zone = { kind: "company" };
const personal: Zone = { kind: "personal", owner: "ana" };
const hits = (s: ReturnType<typeof stack>, principals: string[]) => s.ix.search({ query: "roadmap", asker: { principals } }).map((h) => h.path);

describe("zone changes without an edit to the document", () => {
  it("a demotion from company to personal hides the document on the next reindex", async () => {
    const s = stack();
    put(s.root, "news.md", "roadmap notes", ["ana", "eve"]);
    await s.sync();
    let zone: Zone = company;
    const gate = zoneGate(() => zone, [ana, eve]);
    await s.index(gate);
    expect(hits(s, ["user:eve"])).toEqual(["news.md"]);

    zone = personal;
    await s.index(gate);
    expect(hits(s, ["user:eve"])).toEqual([]);
    expect(hits(s, ["user:ana"])).toEqual(["news.md"]);
  });

  it("a team reader is kept only when the zone lets that team see the document", async () => {
    const s = stack();
    put(s.root, "design.md", "roadmap notes", [], ["eng"]);
    put(s.root, "diary.md", "roadmap notes", [], ["eng"]);
    await s.sync();
    const zones: Record<string, Zone> = { "design.md": { kind: "team", team: "eng" }, "diary.md": personal };
    await s.index(zoneGate((p) => zones[p] as Zone, [ana, eve]));
    expect(hits(s, ["team:eng"])).toEqual(["design.md"]);
    expect(hits(s, ["team:ops"])).toEqual([]);
  });
});
