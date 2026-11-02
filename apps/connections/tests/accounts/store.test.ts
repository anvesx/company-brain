import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { input, tempStore } from "./fixture.js";

let t: ReturnType<typeof tempStore>;
let store: typeof t.store;
beforeEach(() => {
  t = tempStore();
  store = t.store;
});
afterEach(() => t.done());

describe("account store", () => {
  it("creates an active account and never exposes the credential", () => {
    const a = store.create(input);
    expect(a).toMatchObject({ owner: "ann", provider: "github", label: "work", kind: "pat", access: "private", dataZone: "private", status: "active" });
    expect(JSON.stringify(a)).not.toContain("ghp_one");
    expect(store.credential(a.id)).toBe("ghp_one");
  });
  it("allows several accounts per owner and provider", () => {
    store.create(input);
    store.create({ ...input, label: "home" });
    expect(store.listVisible({ user: "ann", tenant: "t1" })).toHaveLength(2);
  });
  it("shows the owner their own accounts plus company ones in the tenant, nothing else", () => {
    store.create(input);
    store.create({ ...input, owner: "bob", label: "bob-private" });
    store.create({ ...input, owner: "bob", label: "bob-company", access: "company" });
    store.create({ ...input, owner: "bob", tenant: "t2", label: "other-tenant", access: "company" });
    store.create({ ...input, owner: "bob", label: "bob-personal", access: "personal" });
    const labels = store
      .listVisible({ user: "ann", tenant: "t1" })
      .map((a) => a.label)
      .sort();
    expect(labels).toEqual(["bob-company", "work"]);
  });
  it("updates label, access and dataZone, and answers undefined for an unknown id", () => {
    const a = store.create(input);
    expect(store.update(a.id, { label: "new", access: "personal", dataZone: "personal" })).toMatchObject({
      label: "new",
      access: "personal",
      dataZone: "personal",
    });
    expect(store.get(a.id)?.label).toBe("new");
    expect(store.update("nope", { label: "x" })).toBeUndefined();
  });
  it("removes the account and its credential", () => {
    const a = store.create(input);
    expect(store.remove(a.id)).toBe(true);
    expect(store.get(a.id)).toBeUndefined();
    expect(store.credential(a.id)).toBeUndefined();
    expect(store.remove(a.id)).toBe(false);
  });
  it("marks needs-auth instead of deleting", () => {
    const a = store.create(input);
    store.setStatus(a.id, "needs-auth");
    expect(store.get(a.id)?.status).toBe("needs-auth");
  });
});
