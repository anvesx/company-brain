import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { input, tempStore } from "./fixture.js";

let t: ReturnType<typeof tempStore>;
let id: string; // an account of tenant t1
const other = "t2"; // every call below asks as the wrong tenant and must see nothing
beforeEach(() => {
  t = tempStore();
  id = t.store.create(input).id;
});
afterEach(() => t.done());

// The row must be exactly as created: same label, still active, no sync time.
const untouched = () => {
  expect(t.store.get("t1", id)).toMatchObject({ label: "work", access: "private", dataZone: "private", status: "active", lastSyncAt: null });
};

describe("a wrong tenant behaves like an unknown id", () => {
  it("get", () => expect(t.store.get(other, id)).toBeUndefined());
  it("update", () => {
    expect(t.store.update(other, id, { label: "x", access: "company", dataZone: "company" })).toBeUndefined();
    untouched();
  });
  it("setLastSync", () => {
    t.store.setLastSync(other, id, 5);
    untouched();
  });
  it("setStatus", () => {
    t.store.setStatus(other, id, "needs-auth");
    untouched();
  });
  it("remove", () => {
    expect(t.store.remove(other, id)).toBe(false);
    untouched();
  });
});
