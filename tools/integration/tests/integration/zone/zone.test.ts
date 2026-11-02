import { type Principal, PromotionError, promote, type Zone } from "@anvesx/zone-policy";
import { describe, expect, it } from "vitest";
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
const found = (s: Awaited<ReturnType<typeof seed>>, u: Principal) =>
  s.ix
    .search({ query: "roadmap", asker: { principals: [`user:${u.user}`] } })
    .map((h) => h.path)
    .sort();

describe("zone-policy decides what rank returns", () => {
  it("personal is owner only, team is members, company is everyone", async () => {
    const s = await seed();
    await s.index(zoneGate((p) => zones[p] as Zone, [ana, bob, eve]));
    expect(found(s, ana)).toEqual(["company/news.md", "personal/diary.md", "team/design.md"]);
    expect(found(s, bob)).toEqual(["company/news.md", "team/design.md"]);
    expect(found(s, eve)).toEqual(["company/news.md"]);
  });

  it("a promotion needs the owner's consent, then the wider zone shows up on reindex", async () => {
    const s = await seed();
    const mine = zones["personal/diary.md"] as Zone;
    const team: Zone = { kind: "team", team: "eng" };
    expect(() => promote(mine, team, undefined)).toThrow(PromotionError);
    expect(() => promote(mine, team, { by: "bob", at: 1 })).toThrow(PromotionError);
    const moved: Record<string, Zone> = { ...zones, "personal/diary.md": promote(mine, team, { by: "ana", at: 1 }) };

    await s.index(zoneGate((p) => zones[p] as Zone, [ana, bob, eve]));
    expect(found(s, bob)).not.toContain("personal/diary.md");
    put(s.root, "personal/diary.md", "roadmap notes shared", everyone);
    await s.sync();
    await s.index(zoneGate((p) => moved[p] as Zone, [ana, bob, eve]));
    expect(found(s, bob)).toContain("personal/diary.md");
    expect(found(s, eve)).not.toContain("personal/diary.md");
  });
});
