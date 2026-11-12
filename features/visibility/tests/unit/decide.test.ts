import { describe, expect, it } from "vitest";
import { decide, type Target, type Viewer } from "../../src/index.js";

const viewer: Viewer = {
  tenant: "t1",
  user: "ada",
  aliases: ["ada@example.test"],
  role: "member",
  zones: ["general"],
};
const target = (over: Partial<Target> = {}): Target => ({
  tenant: "t1",
  id: "drive:plan",
  owner: "owner",
  zone: "general",
  acl: [{ at: 1, allow: ["ada"] }],
  ...over,
});

describe("fail-closed boundaries", () => {
  it.each([
    [{ ...viewer, tenant: "" }, target()],
    [{ ...viewer, user: "" }, target()],
    [viewer, target({ tenant: "t2" })],
    [viewer, target({ zone: "" })],
    [viewer, target({ zone: "finance" })],
    [viewer, target({ acl: [] })],
    [viewer, target({ acl: [{ at: 1, allow: null }] })],
    [viewer, target({ acl: [{ at: 1, allow: [] }] })],
  ])("denies invalid or unknown access", (who, file) => {
    expect(decide(who, file)).toEqual({ visible: false });
  });

  it("uses only the current ACL, regardless of asOf", () => {
    const file = target({
      acl: [
        { at: 1, allow: ["ada"] },
        { at: 2, allow: ["owner"] },
      ],
    });
    expect(decide(viewer, file, { asOf: 1 })).toEqual({ visible: false });
  });

  it("does not let a blank alias match a blank ACL principal", () => {
    expect(decide({ ...viewer, aliases: [""] }, target({ acl: [{ at: 1, allow: [""] }] }))).toEqual({ visible: false });
  });
});

describe("visible results", () => {
  it("matches aliases and does not reveal readers to a member", () => {
    expect(decide(viewer, target({ acl: [{ at: 1, allow: ["ada@example.test", "other"] }] }))).toEqual({ visible: true });
  });

  it("deduplicates reader identities for owners", () => {
    const file = target({ owner: "ada", acl: [{ at: 1, allow: ["ada", "ada", "other"] }] });
    expect(decide(viewer, file)).toEqual({ visible: true, readers: ["ada", "other"] });
  });
});
