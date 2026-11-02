import { type Principal, PromotionError, promote, type Zone } from "@anvesx/zone-policy";
import { describe, expect, it } from "vitest";
import type { ZoneGate } from "../../../src/zone-gate.js";
import { zoneGate } from "../../../src/zone-gate.js";
import { put, stack } from "../../support/world.js";

const ana: Principal = { user: "ana", teams: ["eng"] };
const bob: Principal = { user: "bob", teams: ["eng"] };
const eve: Principal = { user: "eve", teams: ["ops"] };
const zones: Record<string, Zone> = {
  "personal/diary.md": { kind: "personal", owner: "ana" },
  "team/design.md": { kind: "team", team: "eng" },
  "company/news.md": { kind: "company" },
};
const everyone = ["ana", "bob", "eve"];

const seed = async () => {
  const s = stack();
  for (const path of Object.keys(zones)) put(s.root, path, "roadmap notes", everyone);
  await s.sync();
  return s;
};
/** Paths the user may read once the gate has narrowed each listed document's readers. */
const found = (s: Awaited<ReturnType<typeof seed>>, gate: ZoneGate, u: Principal) =>
  s
    .docs()
    .map((d) => gate({ path: d.address, principals: [...d.readers] }))
    .filter((d) => d.principals.includes(`user:${u.user}`))
    .map((d) => d.path)
    .sort();

describe("zone-policy decides which readers stay on a document", () => {
  it("personal is owner only, team is members, company is everyone", async () => {
    const s = await seed();
    const gate = zoneGate((p) => zones[p] as Zone, [ana, bob, eve]);
    expect(found(s, gate, ana)).toEqual(["company/news.md", "personal/diary.md", "team/design.md"]);
    expect(found(s, gate, bob)).toEqual(["company/news.md", "team/design.md"]);
    expect(found(s, gate, eve)).toEqual(["company/news.md"]);
  });

  it("a promotion needs the owner's consent, then the wider zone lets the team in", async () => {
    const s = await seed();
    const mine = zones["personal/diary.md"] as Zone;
    const team: Zone = { kind: "team", team: "eng" };
    expect(() => promote(mine, team, undefined)).toThrow(PromotionError);
    expect(() => promote(mine, team, { by: "bob", at: 1 })).toThrow(PromotionError);
    const moved: Record<string, Zone> = { ...zones, "personal/diary.md": promote(mine, team, { by: "ana", at: 1 }) };

    const before = zoneGate((p) => zones[p] as Zone, [ana, bob, eve]);
    const after = zoneGate((p) => moved[p] as Zone, [ana, bob, eve]);
    expect(found(s, before, bob)).not.toContain("personal/diary.md");
    expect(found(s, after, bob)).toContain("personal/diary.md");
    expect(found(s, after, eve)).not.toContain("personal/diary.md");
    expect(before.tag("personal/diary.md")).not.toBe(after.tag("personal/diary.md"));
  });
});
