import { zoneOf, zonesFor } from "@anvesx/visibility/gate";
import { canSee, type Zone } from "@anvesx/zone-policy";
import { describe, expect, it } from "vitest";

// The gate keeps zones as strings and cannot import zone-policy (feature to feature). This pins the two to the same answer.
const cases: { zone: Zone; props: Record<string, string> }[] = [
  { zone: { kind: "company" }, props: { zone: "company" } },
  { zone: { kind: "personal", owner: "ann" }, props: { zone: "personal", owner: "ann" } },
  { zone: { kind: "personal", owner: "bob" }, props: { zone: "personal", owner: "bob" } },
  { zone: { kind: "team", team: "eng" }, props: { zone: "team", team: "eng" } },
  { zone: { kind: "team", team: "ops" }, props: { zone: "team", team: "ops" } },
];
const viewers = [
  { user: "ann", teams: ["eng"] },
  { user: "bob", teams: [] },
  { user: "cy", teams: ["eng", "ops"] },
];

describe("the gate's zone check equals zone-policy canSee", () => {
  for (const viewer of viewers)
    for (const { zone, props } of cases)
      it(`${viewer.user} on ${JSON.stringify(props)}`, () => {
        expect(zonesFor(viewer.user, viewer.teams).includes(zoneOf(props))).toBe(canSee(zone, viewer));
      });
  it("a document with no zone, an unknown zone or a personal zone with no owner matches nobody", () => {
    for (const props of [{}, { zone: "galaxy" }, { zone: "personal" }, { zone: "team" }]) {
      expect(zonesFor("ann", ["eng"]).includes(zoneOf(props))).toBe(false);
    }
  });
});
