import { describe, expect, it } from "vitest";
import { zoneOf, zonesFor } from "../../src/zone.js";

describe("zones", () => {
  it.each([
    [{ zone: "company" }, "company"],
    [{ zone: "personal", owner: "ann" }, "personal:ann"],
    [{ zone: "team", team: "eng" }, "team:eng"],
    [{ zone: "personal" }, ""],
    [{ zone: "team" }, ""],
    [{ zone: "galaxy" }, ""],
    [{}, ""],
  ])("%j is %j", (props, zone) => expect(zoneOf(props)).toBe(zone));
  it("lets a viewer see company, their own personal zone and their teams", () => {
    expect(zonesFor("ann", ["eng"])).toEqual(["company", "personal:ann", "team:eng"]);
  });
});
