import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { count, one } from "../../support/db.js";
import { type Person, signUp } from "../../support/http.js";
import { connectorConfig, follow, linkReplay } from "../../support/replay/flow.js";
import { type Replay, startReplay } from "../../support/replay/server.js";
import { boot, type Env } from "../../support/server.js";

let [env, replay, ada] = [undefined as unknown as Env, undefined as unknown as Replay, undefined as unknown as Person];
beforeEach(async () => {
  replay = await startReplay();
  const replayOnly = connectorConfig(replay);
  const notion = { id: "notion", name: "Notion", description: "Pages", scopes: ["read"], kind: "built-in" as const };
  env = await boot({ ...replayOnly, providers: [...(replayOnly.providers ?? []), notion] });
  ada = await signUp(env, "Ada");
});
afterEach(async () => Promise.all([env.close(), replay.close()]));

const csrf = (who: Person) => env.identity.csrf.issue(who.browser.headers());
const page = async (who: Person) => (await who.browser.call("/connections")).text();
const tile = (html: string, attr: string, id: string) => new RegExp(`<li ${attr}="${id}"[^>]*>([\\s\\S]*?)</li>`).exec(html)?.[0] ?? "";

describe("connector tiles (connector-accounts rules 8, 9 and 11)", () => {
  it("rule 11: a provider without env secrets is greyed out with 'not configured' and has no link form", async () => {
    const notion = tile(await page(ada), "data-provider", "notion");
    expect(notion).toContain('aria-disabled="true"');
    expect(notion).toContain("not configured");
    expect(notion).not.toContain('action="/connections/link/notion"');
    const res = await ada.browser.call("/connections/link/notion", { form: { csrf: await csrf(ada) } });
    expect(res.status).toBe(404);
  });

  it("rule 11: a configured provider's tile is a csrf form posting to its link route", async () => {
    const replayTile = tile(await page(ada), "data-provider", "replay");
    expect(replayTile).toContain('<form method="post" action="/connections/link/replay">');
    expect(replayTile).toMatch(/<input type="hidden" name="csrf" value="[^"]+">/);
  });

  it("rule 8: a needs-auth tile offers 'Sign in again'; success sets it active and keeps the account id", async () => {
    const { id } = await linkReplay(env, ada);
    env.db.prepare("update account set status = 'needs-auth' where id = ?").run(id);
    const stale = tile(await page(ada), "data-account", id);
    expect(stale).toContain("Sign in again");
    expect(stale).toContain('action="/connections/link/replay"');
    const { at } = await follow(ada.browser, await ada.browser.call("/connections/link/replay", { form: { csrf: await csrf(ada) } }));
    expect(at.pathname).toBe("/connections");
    expect(one(env.db, "select id, status from account where userId = ? and providerId = 'replay'", ada.userId)).toEqual({ id, status: "active" });
    expect(tile(await page(ada), "data-account", id)).not.toContain("Sign in again");
  });

  it("rule 9: unlink is a csrf form that answers 303 to /connections and removes the row", async () => {
    const { id } = await linkReplay(env, ada);
    expect(tile(await page(ada), "data-account", id)).toContain(`action="/connections/unlink/${id}"`);
    const res = await ada.browser.call(`/connections/unlink/${id}`, { form: { csrf: await csrf(ada) } });
    expect([res.status, res.headers.get("location")]).toEqual([303, "/connections"]);
    expect(count(env.db, "select count(*) as n from account where id = ?", id)).toBe(0);
    expect(count(env.db, "select count(*) as n from account where userId = ? and providerId = 'credential'", ada.userId)).toBe(1);
  });

  it("rule 9: another person's account id is 404 and the row stays; a missing csrf is 403", async () => {
    const { id } = await linkReplay(env, ada);
    const bob = await signUp(env, "Bob");
    expect((await bob.browser.call(`/connections/unlink/${id}`, { form: { csrf: await csrf(bob) } })).status).toBe(404);
    expect((await ada.browser.call(`/connections/unlink/${id}`, { form: { csrf: "" } })).status).toBe(403);
    expect(count(env.db, "select count(*) as n from account where id = ?", id)).toBe(1);
  });
});
