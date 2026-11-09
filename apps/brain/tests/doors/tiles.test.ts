import { afterEach, describe, expect, it } from "vitest";
import { doorsFromEnv } from "../../src/doors/env.js";
import { bootBrain, type Env, signUp } from "../identity/boot.js";

// The user's complaint on 2026-11-07: "I don't see buttons for mcp authentications". /connections said
// "No connectors are available yet" because the brain app handed identity no catalog. Now it hands over src/doors/catalog.ts.
const SECRET = "brain-doors-test-secret-0123456789abcdef";
let env: Env | undefined;
afterEach(async () => {
  await env?.close();
  env = undefined;
});

const tile = (html: string, id: string): string => html.match(new RegExp(`<li data-provider="${id}"[^>]*>.*?</li>`, "s"))?.[0] ?? "";

describe("connector tiles on /connections", () => {
  it("lists every catalog entry greyed as not configured when no provider secrets are set", async () => {
    env = await bootBrain({}, doorsFromEnv({}, SECRET));
    const ann = await signUp(env, "Ann");
    const html = await (await ann.browser.call("/connections")).text();
    expect(html).not.toContain("No connectors are available yet");
    for (const id of ["github", "google-drive", "slack"]) {
      const li = tile(html, id);
      expect(li, id).toContain('aria-disabled="true"');
      expect(li, id).toContain("<em>not configured</em>");
      expect(li, id).not.toContain("Connect</button>");
    }
  });

  it("gives a tile its Connect form once its <ID>_CLIENT_ID and <ID>_CLIENT_SECRET are set, and no other tile", async () => {
    env = await bootBrain({}, doorsFromEnv({ GITHUB_CLIENT_ID: "gh-id", GITHUB_CLIENT_SECRET: "gh-secret" }, SECRET));
    const ann = await signUp(env, "Ann");
    const html = await (await ann.browser.call("/connections")).text();
    expect(tile(html, "github")).toContain('<form method="post" action="/connections/link/github">');
    expect(tile(html, "github")).not.toContain("not configured");
    expect(tile(html, "slack")).toContain("<em>not configured</em>");
    expect(html).not.toContain("gh-secret"); // the secret never reaches the page
    expect(html).not.toContain("gh-id");
  });

  it("the page still names the MCP install URL the server actually serves", async () => {
    env = await bootBrain({}, doorsFromEnv({}, SECRET));
    const ann = await signUp(env, "Ann");
    const html = await (await ann.browser.call("/connections")).text();
    expect(html).toContain(`${env.base}/mcp`);
    const res = await fetch(`${env.base}/mcp`, { method: "POST" });
    expect(res.status).toBe(401); // mounted: refused for want of a bearer, not 404
  });
});
