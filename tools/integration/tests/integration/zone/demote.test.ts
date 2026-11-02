import type { Zone } from "@anvesx/zone-policy";
import { describe, expect, it } from "vitest";
import { zoneGate } from "../../../src/zone-gate.js";
import { put, stack } from "../../support/world.js";

const ana = { user: "ana", teams: ["eng"] };
const eve = { user: "eve", teams: ["ops"] };
const company: Zone = { kind: "company" };
const personal: Zone = { kind: "personal", owner: "ana" };
const readers = (s: ReturnType<typeof stack>, gate: ReturnType<typeof zoneGate>) =>
  s.docs().map((d) => ({ path: d.address, principals: gate({ path: d.address, principals: [...d.readers] }).principals }));

describe("zone changes without an edit to the document", () => {
  it("a demotion from company to personal drops the reader and changes the gate tag", async () => {
    const s = stack();
    put(s.root, "news.md", "roadmap notes", ["ana", "eve"]);
    await s.sync();
    let zone: Zone = company;
    const gate = zoneGate(() => zone, [ana, eve]);
    const tagBefore = gate.tag("news.md");
    expect(readers(s, gate)).toEqual([{ path: "news.md", principals: ["user:ana", "user:eve"] }]);

    zone = personal;
    expect(gate.tag("news.md")).not.toBe(tagBefore);
    expect(readers(s, gate)).toEqual([{ path: "news.md", principals: ["user:ana"] }]);
  });

  it("a team reader is kept only when the zone lets that team see the document", async () => {
    const s = stack();
    put(s.root, "design.md", "roadmap notes", [], ["eng"]);
    put(s.root, "diary.md", "roadmap notes", [], ["eng"]);
    await s.sync();
    const zones: Record<string, Zone> = { "design.md": { kind: "team", team: "eng" }, "diary.md": personal };
    const gate = zoneGate((p) => zones[p] as Zone, [ana, eve]);
    const out = readers(s, gate).sort((a, b) => a.path.localeCompare(b.path));
    expect(out).toEqual([
      { path: "design.md", principals: ["team:eng"] },
      { path: "diary.md", principals: [] },
    ]);
  });
});
