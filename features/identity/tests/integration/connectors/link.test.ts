import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { count } from "../../support/db.js";
import { Browser, type Person, signUp } from "../../support/http.js";
import { connectorConfig, linkReplay, newSealKey } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay, ada] = [undefined as unknown as Env, undefined as unknown as Replay, undefined as unknown as Person];
beforeEach(async () => {
  replay = await startReplay();
  env = await boot(connectorConfig(replay));
  ada = await signUp(env, "Ada");
});
afterEach(async () => Promise.all([env.close(), replay.close()]));

// The csrf token must come from the server the person signed up on, so `on` is passed explicitly.
const linkPost = async (on: Env, who: Person, id: string) =>
  who.browser.call(`/connections/link/${id}`, { form: { csrf: await on.identity.csrf.issue(who.browser.headers()) } });

describe("connector link (connector-accounts rules 1 and 2)", () => {
  it("rule 1: the tile form answers 302 to the provider with our client id, callback, scope, PKCE S256 and state", async () => {
    const res = await linkPost(env, ada, "replay");
    expect(res.status).toBe(302);
    const to = new URL(res.headers.get("location") ?? "");
    expect(to.origin + to.pathname).toBe(`${replay.base}/authorize`);
    expect(to.searchParams.get("client_id")).toBe("replay-client");
    expect(to.searchParams.get("redirect_uri")).toBe(`${env.base}/api/auth/callback/replay`);
    expect(to.searchParams.get("scope")?.split(" ")).toContain("read");
    expect([to.searchParams.get("code_challenge_method"), Boolean(to.searchParams.get("state"))]).toEqual(["S256", true]);
  });

  it("rule 1: the full flow lands on /connections and stores one account row for the signed-in person", async () => {
    const { at } = await linkReplay(env, ada);
    expect(at.pathname).toBe("/connections");
    expect(count(env.db, "select count(*) as n from account where userId = ? and providerId = 'replay' and accountId = ?", ada.userId, "replay-user-1")).toBe(
      1,
    );
    expect(count(env.db, "select count(*) as n from user")).toBe(1);
  });

  it("rule 1: an unknown id is 404, a missing csrf is 403, and a signed-out post goes to /sign-in", async () => {
    expect((await linkPost(env, ada, "nope")).status).toBe(404);
    expect((await ada.browser.call("/connections/link/replay", { form: { csrf: "" } })).status).toBe(403);
    const out = await new Browser(env.base).call("/connections/link/replay", { form: { csrf: "x" } });
    expect([out.status, out.headers.get("location")]).toEqual([302, "/sign-in"]);
    expect(replay.state.calls.authorize).toBe(0);
  });

  it("rule 1: a built-in provider redirects to its own consent page with the env client id; no network call", async () => {
    const tile = { id: "github", name: "GitHub", description: "Code", scopes: ["repo"], kind: "built-in" as const };
    const gh = await boot({ sealKey: newSealKey(), env: { GITHUB_CLIENT_ID: "gh-client", GITHUB_CLIENT_SECRET: "gh-secret" }, providers: [tile] });
    try {
      const res = await linkPost(gh, await signUp(gh, "Ada"), "github");
      const to = new URL(res.headers.get("location") ?? "");
      expect([res.status, to.origin + to.pathname]).toEqual([302, "https://github.com/login/oauth/authorize"]);
      expect([to.searchParams.get("client_id"), to.searchParams.get("redirect_uri")]).toEqual(["gh-client", `${gh.base}/api/auth/callback/github`]);
    } finally {
      await gh.close();
    }
  });

  it("rule 2: a linked tile shows the provider email, the linked time and the status, to its owner only", async () => {
    const { id } = await linkReplay(env, ada);
    const page = await (await ada.browser.call("/connections")).text();
    const tile = new RegExp(`<li data-account="${id}"[^>]*>([\\s\\S]*?)</li>`).exec(page)?.[1] ?? "";
    expect(tile).toContain("ada@provider.example");
    expect(tile).toMatch(/<time datetime="\d{4}-\d{2}-\d{2}T[^"]+">/);
    expect(tile).toContain("active");
    const bob = await signUp(env, "Bob");
    const bobPage = await (await bob.browser.call("/connections")).text();
    expect([bobPage.includes(id), bobPage.includes("ada@provider.example")]).toEqual([false, false]);
  });
});
