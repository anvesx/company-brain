import { afterEach, describe, expect, it } from "vitest";
import { signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
afterEach(() => env.close());

describe("GET /connections errors", () => {
  it("rule 3: a user with no organization sees the NO_ORGANIZATION alert as a 400", async () => {
    env = await boot();
    const ada = await signUp(env, "Ada");
    env.db.prepare("delete from member where userId = ?").run(ada.userId);
    const res = await ada.browser.call("/connections");
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('<p role="alert">You do not belong to an organization yet.</p>');
  });

  it("rule 13: an error that is not an IdentityError is 400 'Something went wrong.' and leaks nothing", async () => {
    env = await boot({
      connections: async () => {
        throw new Error("secret database detail");
      },
    });
    const ada = await signUp(env, "Ada");
    const res = await ada.browser.call("/connections");
    const body = await res.text();
    expect(res.status).toBe(400);
    expect(body).toContain('<p role="alert">Something went wrong.</p>');
    expect(body).not.toContain("secret database detail");
  });

  it("rule 11: with connections the page lists them and no catalog", async () => {
    env = await boot({ catalog: [{ name: "Slack", description: "Channels" }], connections: async () => [{ name: "Notion", detail: "12 pages" }] });
    const ada = await signUp(env, "Ada");
    const body = await (await ada.browser.call("/connections")).text();
    expect(body).toContain("<li><strong>Notion</strong> 12 pages</li>");
    expect(body).not.toContain("Slack");
  });

  it("rule 11: with none the page shows the catalog", async () => {
    env = await boot({ catalog: [{ name: "Slack", description: "Channels" }] });
    const ada = await signUp(env, "Ada");
    expect(await (await ada.browser.call("/connections")).text()).toContain("<li><strong>Slack</strong> Channels</li>");
  });
});
