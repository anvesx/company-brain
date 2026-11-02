import { describe, expect, it } from "vitest";
import { mostRestrictedZone, ZoneSchema } from "../../src/access/zone.js";

describe("zone", () => {
  it("takes the most restricted zone of the inputs", () => {
    expect(mostRestrictedZone(["personal", "company", "team"])).toBe("personal");
    expect(mostRestrictedZone(["personal"])).toBe("personal");
    expect(mostRestrictedZone(["team", "company"])).toBe("team");
  });
  it("rejects an empty list", () => {
    expect(() => mostRestrictedZone([])).toThrow(RangeError);
  });
  it("rejects unknown zones", () => {
    expect(ZoneSchema.safeParse("secret").success).toBe(false);
  });
});
