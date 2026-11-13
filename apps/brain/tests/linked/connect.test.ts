import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { one } from "../../../../features/identity/tests/support/db.js";
import { follow } from "../../../../features/identity/tests/support/replay/flow.js";
import { doorsFromEnv } from "../../src/doors/env.js";
import { bootBrain, type Env, signUp } from "../identity/boot.js";
import { startProvider } from "./provider.js";

const SECRET = "brain-linked-test-secret-0123456789abcdef";
let [env, provider] = [undefined as unknown as Env, undefined as unknown as Awaited<ReturnType<typeof startProvider>>];
beforeEach(async () => {
  provider = await startProvider();
  const keys = Object.fromEntries(
    ["GITHUB", "GOOGLE_DRIVE", "SLACK"].flatMap((p) => [
      [`${p}_CLIENT_ID`, provider.replay.state.clientId],
      [`${p}_CLIENT_SECRET`, provider.replay.state.clientSecret],
      [`${p}_BASE_URL`, provider.base],
    ]),
  );
  const vars = { ...keys };
  env = await bootBrain({ env: vars }, doorsFromEnv(vars, SECRET));
});
afterEach(async () => Promise.all([env.close(), provider.close()]));

const tile = (html: string, id: string) => html.match(new RegExp(`<li data-provider="${id}" class="tile"[^>]*>.*?</li>`, "s"))?.[0] ?? "";

describe.each([
  ["github", "anvesx/company-brain"],
  ["google-drive", "Q3 plan"],
  ["slack", "#general"],
])("connect %s", (id, expected) => {
  it("plus -> provider -> callback: sealed tokens, a check on the tile, real rows from the API", async () => {
    const ann = await signUp(env, "Ann");
    const before = await (await ann.browser.call("/connections")).text();
    expect(tile(before, id)).toContain(`action="/connections/link/${id}"`);
    expect(tile(before, id)).toContain(">+</button>");

    const csrf = await env.identity.csrf.issue(ann.browser.headers());
    const first = await ann.browser.call(`/connections/link/${id}`, { form: { csrf } });
    expect(new URL(first.headers.get("location") ?? "").origin).toBe(provider.base); // the browser leaves for the provider
    const { at } = await follow(ann.browser, first);
    expect(at.pathname).toBe("/connections"); // and comes back through /api/auth/callback/<id>

    const after = await (await ann.browser.call("/connections")).text();
    expect(tile(after, id)).toContain('aria-label="Connected"');
    expect(tile(after, id)).not.toContain(">+</button>");
    const row = one(env.db, "select accessToken, refreshToken from account where userId = ? and providerId = ?", ann.userId, id);
    for (const column of ["accessToken", "refreshToken"]) expect(String(row[column])).not.toMatch(/^(at|rt)-|^[0-9a-f-]{20,}$/i); // ciphertext, not the provider's token

    const data = await ann.browser.call(`/connections/data/${id}`);
    expect(data.status).toBe(200);
    expect(await data.text()).toContain(expected);
    expect(provider.calls.length).toBeGreaterThan(0);
    expect(provider.replay.state.grants.userFor(provider.calls[0]?.bearer ?? "")).toBeTruthy(); // the stored token, opened, reached the API
  });
});

describe("data page edges", () => {
  it("signed out goes to /sign-in; unlinked or unknown is 404", async () => {
    const out = await fetch(`${env.base}/connections/data/github`, { redirect: "manual" });
    expect([out.status, out.headers.get("location")]).toEqual([302, `${env.base}/sign-in`]);
    const ann = await signUp(env, "Ann");
    expect((await ann.browser.call("/connections/data/github")).status).toBe(404);
    expect((await ann.browser.call("/connections/data/__proto__")).status).toBe(404);
  });
});
