import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ann, bob } from "../http/fixture.js";
import { type Harness, harness } from "./harness.js";

let h: Harness;
beforeEach(async () => {
  h = await harness();
});
afterEach(() => h.close());

describe("oauth start and state handling", () => {
  it("rejects bad input: no bearer, unknown provider, bad zone", async () => {
    expect((await h.s.call("GET", "/v1/oauth/github/start")).status).toBe(401);
    expect((await h.s.call("GET", "/v1/oauth/slack/start", ann)).status).toBe(404);
    expect((await h.s.call("GET", "/v1/oauth/github/start?access=everyone", ann)).status).toBe(400);
  });
  it("uses each state once and only for the provider it was issued to", async () => {
    const f = await h.signIn(ann, "github");
    expect((await h.s.call("GET", `/v1/oauth/google/callback${f.back.search}`)).status).toBe(400);
    expect((await h.s.call("GET", f.back.pathname + f.back.search)).status).toBe(400);
    const g = await h.signIn(bob, "github");
    expect((await g.callback()).status).toBe(201);
    expect((await g.callback()).status).toBe(400);
    expect(h.s.store.listVisible({ user: "bob", tenant: "t1" })).toHaveLength(1);
  });
  it("rejects an unknown state and an expired one without calling the provider", async () => {
    expect((await h.s.call("GET", "/v1/oauth/github/callback?state=nope&code=x")).status).toBe(400);
    const f = await h.signIn(ann, "github");
    h.advance(601);
    expect((await f.callback()).status).toBe(400);
    expect(h.replay.tokenCalls).toBe(0);
  });
});
