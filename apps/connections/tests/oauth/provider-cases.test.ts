import { afterEach, describe, expect, it } from "vitest";
import { ann } from "../http/fixture.js";
import { type Harness, harness } from "./harness.js";

let h: Harness;
afterEach(() => h.close());

describe("failures at the provider", () => {
  it("answers 400 and creates nothing when the user denies consent", async () => {
    h = await harness({ deny: true });
    const f = await h.signIn(ann, "github");
    expect(f.back.searchParams.get("error")).toBe("access_denied");
    expect((await f.callback()).status).toBe(400);
    expect(h.s.store.listVisible({ user: "ann", tenant: "t1" })).toHaveLength(0);
  });
  it("answers 502 and creates nothing when the token exchange is refused", async () => {
    h = await harness({}, "wrong-secret");
    const f = await h.signIn(ann, "github");
    expect((await f.callback()).status).toBe(502);
    expect(h.s.store.listVisible({ user: "ann", tenant: "t1" })).toHaveLength(0);
  });
});

describe("google oauth with PKCE", () => {
  it("sends an S256 challenge and offline access, and stores a drive account with the refresh token", async () => {
    h = await harness({ refresh: true });
    const f = await h.signIn(ann, "google");
    expect(f.start.searchParams.get("code_challenge_method")).toBe("S256");
    expect(f.start.searchParams.get("access_type")).toBe("offline");
    expect(f.start.searchParams.get("scope")).toContain("drive.readonly");
    const r = await f.callback();
    expect(r.status).toBe(201);
    const a = (await r.json()) as { id: string; provider: string };
    expect(a.provider).toBe("drive");
    const stored = JSON.parse(h.s.store.credential("t1", a.id) ?? "");
    expect(stored).toMatchObject({ accessToken: expect.stringMatching(/^at_/), refreshToken: expect.stringMatching(/^rt_/) });
  });
});
