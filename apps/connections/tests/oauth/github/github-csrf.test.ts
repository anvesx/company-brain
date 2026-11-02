import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ann, bob } from "../../http/fixture.js";
import { type Harness, harness } from "../harness.js";

let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(() => h.close());

const accounts = (user: string) => h.s.store.listVisible({ user, tenant: "t1" });

describe("login CSRF: a state only completes in the browser that started it", () => {
  it("sets a signed HttpOnly SameSite=Lax cookie that does not hold the state", async () => {
    const f = await h.signIn(ann, "github");
    expect(f.setCookie).toMatch(/HttpOnly/i);
    expect(f.setCookie).toMatch(/SameSite=Lax/i);
    expect(f.setCookie).not.toContain(f.start.searchParams.get("state") ?? "x");
  });
  it("refuses an attacker-obtained authorize URL completed by a victim with no cookie", async () => {
    const f = await h.signIn(ann, "github");
    const r = await f.callbackWith("");
    expect(r.status).toBe(400);
    expect(accounts("ann")).toEqual([]);
    expect(h.replay.tokenCalls).toBe(0);
  });
  it("refuses another caller's valid cookie and a tampered one", async () => {
    const f = await h.signIn(ann, "github");
    const g = await h.signIn(bob, "github");
    expect((await f.callbackWith(g.setCookie.split(";")[0] ?? "")).status).toBe(400);
    const tampered = `${g.setCookie.split(";")[0]?.slice(0, -1)}0`;
    expect((await g.callbackWith(tampered)).status).toBe(400);
    expect(accounts("ann")).toEqual([]);
    expect(accounts("bob")).toEqual([]);
    expect(h.replay.tokenCalls).toBe(0);
  });
  it("still completes the legitimate flow", async () => {
    const f = await h.signIn(ann, "github");
    expect((await f.callback()).status).toBe(201);
    expect(accounts("ann")).toHaveLength(1);
  });
});
