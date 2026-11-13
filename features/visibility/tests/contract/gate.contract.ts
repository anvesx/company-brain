import { beforeAll, describe, expect, it } from "vitest";
import { type Api, ann, ben, cy, file, load } from "./api.js";

let api: Api;
beforeAll(async () => {
  api = await load();
});
const sees = (...args: Parameters<Api["decide"]>): boolean => api.decide(...args).visible;
describe("one visibility decision (leak 3)", () => {
  it("exports exactly one decision function", () => {
    const fns = Object.entries(api).filter(([, v]) => typeof v === "function");
    expect(fns.map(([k]) => k)).toEqual(["decide"]);
  });

  it("matches a viewer by user id, by verified email and by linked account id alike", () => {
    expect(sees(ben, file(["u-ben"]))).toBe(true);
    expect(sees(ben, file(["ben@acme.test"]))).toBe(true);
    expect(sees(ann, file(["github:ann"], { owner: "u-someone" }))).toBe(true);
  });

  it("hides a file from a viewer who is not listed", () => {
    expect(sees(ben, file(["u-ann"]))).toBe(false);
  });

  it("hides every file of another tenant, even when the same email is listed", () => {
    expect(sees(cy, file(["cy@globex.test", "u-cy"]))).toBe(false);
  });

  it("fails closed when the permission record could not be read", () => {
    expect(sees(ben, file(null))).toBe(false);
    expect(sees(ben, file([], { acl: [] }))).toBe(false);
  });
});

describe("past views use current permissions (leak 1)", () => {
  const [shared, narrowed] = [
    { at: 1_000, allow: ["u-ann", "u-ben"] },
    { at: 2_000, allow: ["u-ann"] },
  ];
  const revoked = file(["u-ben"], { acl: [shared, narrowed] });

  it("hides a file revoked since, when the viewer asks for a time before the revocation", () => {
    expect(sees(ben, revoked, { asOf: 1_500 })).toBe(false);
    expect(sees(ben, revoked)).toBe(false);
  });

  it("still shows the past view to someone who has access now", () => {
    expect(sees(ann, revoked, { asOf: 1_500 })).toBe(true);
  });
});

describe("reader lists are for owners and admins only (leak 4)", () => {
  const shared = file(["u-ann", "u-ben", "u-dee"]);

  it("gives a plain reader no list of the other readers", () => {
    expect(api.decide(ben, shared)).toEqual({ visible: true });
  });

  it("gives the owner and an admin the list", () => {
    expect(api.decide(ann, shared)).toEqual({ visible: true, readers: ["u-ann", "u-ben", "u-dee"] });
    expect(api.decide({ ...ben, role: "admin" }, shared)).toEqual({ visible: true, readers: ["u-ann", "u-ben", "u-dee"] });
  });
});

describe("zones are enforced (leak 5)", () => {
  it("hides a file in a zone the viewer is not in, even when the viewer is listed", () => {
    expect(sees(ben, file(["u-ben"], { zone: "finance" }))).toBe(false);
    expect(sees(ann, file(["u-ann"], { zone: "finance" }))).toBe(true);
  });
});

describe("the gate is fast (PLAN 10: 5 ms)", () => {
  it("decides 10,000 files in under 5 ms each on average", () => {
    const targets = Array.from({ length: 10_000 }, (_, i) => file([`u-${i}`, "u-ben"], { id: `drive:${i}` }));
    const started = performance.now();
    const shown = targets.filter((t) => sees(ben, t)).length;
    expect(shown).toBe(10_000);
    expect((performance.now() - started) / 10_000).toBeLessThan(5);
  });
});
