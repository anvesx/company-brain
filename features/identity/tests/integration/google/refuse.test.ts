import { afterEach, describe, expect, it } from "vitest";
import { count, MINUTE } from "../../support/db.js";
import { Browser } from "../../support/http.js";
import { connectorConfig, follow, googleConfig } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay] = [undefined as unknown as Env, undefined as unknown as Replay];
afterEach(async () => Promise.all([env.close(), replay.close()]));
const start = async (google: boolean) => {
  replay = await startReplay({ oidc: true });
  env = await boot({ ...connectorConfig(replay), ...(google ? googleConfig(replay) : {}) });
};
const post = (path: string, init: Parameters<Browser["call"]>[1] = { form: {} }) => new Browser(env.base).call(path, init);

describe("Google login refusals (google-login rules 2, 5 and 6)", () => {
  it("rule 2: without google config there is no button, /sign-in/google is 404, and boot still works", async () => {
    await start(false);
    expect(await (await new Browser(env.base).call("/sign-in")).text()).not.toContain("Continue with Google");
    expect((await post("/sign-in/google")).status).toBe(404);
    expect((await post("/api/auth/sign-in/social", { json: { provider: "google", callbackURL: "/connections" } })).status).toBe(404);
  });

  it("rule 2: a connector provider is never a sign-in door: /api/auth/sign-in/social for it is 404", async () => {
    await start(true);
    const res = await post("/api/auth/sign-in/social", { json: { provider: "replay", callbackURL: "/connections" } });
    expect(res.status).toBe(404);
    expect(replay.state.calls.authorize).toBe(0);
  });

  it("rule 5: an unverified Google email is refused on /sign-in with an alert; no user and no session", async () => {
    await start(true);
    replay.state.user = { ...replay.state.user, email_verified: false };
    const browser = new Browser(env.base);
    const { at, res } = await follow(browser, await browser.call("/sign-in/google", { form: {} }));
    expect(at.pathname).toBe("/sign-in");
    expect(await res.text()).toMatch(/<p role="alert">[^<]*verified[^<]*<\/p>/i);
    expect(count(env.db, "select count(*) as n from user")).toBe(0);
    expect([...browser.jar.keys()].some((name) => name.includes("session_token"))).toBe(false);
  });

  it("rule 6: five starts per 15 minutes per address, then 429 with Retry-After, then allowed again", async () => {
    await start(true);
    for (let i = 0; i < 5; i += 1) expect((await post("/sign-in/google")).status).toBe(302);
    const blocked = await post("/sign-in/google");
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    env.clock.advance(15 * MINUTE + 1000);
    expect((await post("/sign-in/google")).status).toBe(302);
  });

  it("rule 6: the direct API start is limited too, and the page and the API share one counter", async () => {
    await start(true);
    const api = () => post("/api/auth/sign-in/social", { json: { provider: "google", callbackURL: "/connections" } });
    for (let i = 0; i < 3; i += 1) expect((await api()).status).toBe(200);
    for (let i = 0; i < 2; i += 1) expect((await post("/sign-in/google")).status).toBe(302);
    // Five starts in all (3 API + 2 page): the sixth, by either door, is refused.
    expect((await api()).status).toBe(429);
    expect((await post("/sign-in/google")).status).toBe(429);
    expect(Number((await api()).headers.get("retry-after"))).toBeGreaterThan(0);
  });
});
