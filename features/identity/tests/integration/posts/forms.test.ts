import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TEMPLATES } from "../../../src/index.js";
import { Browser, type Person, signUp } from "../../support/http.js";
import { boot, type Env } from "../../support/server.js";

let env: Env;
let ada: Person;
beforeEach(async () => {
  env = await boot();
  ada = await signUp(env, "Ada");
});
afterEach(() => env.close());

const csrfFor = (who: Person): Promise<string> => env.identity.csrf.issue(who.browser.headers());

describe("form posts: Origin and CSRF", () => {
  it("rule 12: a form post from a foreign Origin is 403 and does not sign the user out", async () => {
    const res = await ada.browser.call("/sign-out", { form: { csrf: await csrfFor(ada) }, origin: "https://evil.example.com" });
    expect(res.status).toBe(403);
    // The session survived, so the signed-in page still renders.
    expect((await ada.browser.call("/connections")).status).toBe(200);
  });

  it("rule 12: a form post with no Origin header is 403", async () => {
    expect((await ada.browser.call("/sign-out", { form: { csrf: await csrfFor(ada) }, origin: null })).status).toBe(403);
  });

  it("rule 12: a missing csrf field is 403", async () => {
    expect((await ada.browser.call("/sign-out", { form: {} })).status).toBe(403);
    expect((await ada.browser.call("/connections")).status).toBe(200);
  });

  it("rule 12: a csrf token issued to another session is 403", async () => {
    const bob = await signUp(env, "Bob");
    expect((await ada.browser.call("/sign-out", { form: { csrf: await csrfFor(bob) } })).status).toBe(403);
  });

  it("rule 12: the right token from the same origin signs out with a 302 to /sign-in", async () => {
    const res = await ada.browser.call("/sign-out", { form: { csrf: await csrfFor(ada) } });
    expect([res.status, res.headers.get("location")]).toEqual([302, "/sign-in"]);
  });
});

describe("page headers and install guide", () => {
  it("rule 11: every page forbids framing", async () => {
    const res = await new Browser(env.base).call("/sign-in");
    expect(res.headers.get("x-frame-options")).toBe("DENY");
    expect(res.headers.get("content-security-policy")).toContain("frame-ancestors 'none'");
  });

  it("rule 10: over http on localhost the connections page renders the install guide", async () => {
    const res = await ada.browser.call("/connections");
    const text = await res.text();
    expect(res.status).toBe(200);
    expect(text).toContain("claude mcp add --transport http &#39;company-brain&#39; &#39;http://localhost:");
  });

  it("rule 10: the server name comes from config", async () => {
    const other = await boot({ serverName: "acme-brain" });
    const who = await signUp(other, "Cy");
    expect(await (await who.browser.call("/connections")).text()).toContain("acme-brain");
    await other.close();
  });

  it("rule 10: a template that renders a broken file is a 500 naming the client", async () => {
    const broken = { ...TEMPLATES, codex: { ...TEMPLATES.codex, entry: () => ({ "bad key": "x" }) } };
    const other = await boot({ templates: broken });
    const who = await signUp(other, "Di");
    const res = await who.browser.call("/connections");
    expect(res.status).toBe(500);
    expect(await res.text()).toContain("codex");
    await other.close();
  });
});
