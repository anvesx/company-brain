import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { skip } from "../../../../features/google-identity/tests/support/db.js";
import { bootUi } from "./harness.js";

let s: Awaited<ReturnType<typeof bootUi>>;
beforeAll(async () => {
  if (!skip) s = await bootUi();
});
afterAll(() => s?.close());

const form = (s2: string, body: Record<string, string> = {}) => ({
  method: "POST",
  headers: { origin: s2, "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(body).toString(),
});

describe.skipIf(skip)("add, connect, sync, disconnect in a browser", () => {
  it("walks the whole flow with no token or password field anywhere", async () => {
    const b = await s.signedIn("ann");
    const home = await (await b.send(`${s.base}/`)).text();
    expect(home).toContain("ann@example.com");
    expect(home).toContain("No app is connected yet.");
    expect(home).toContain('href="/connect/github"');
    expect(home).toContain("Not available on this server");
    expect(home).toContain("Slack, Google Drive, Gmail: No OAuth client is set up for it on this server.");
    expect(home).toMatch(/<h2[^>]*>Code <span class="count">1<\/span>/);
    expect(home).toContain('class="btn btn-2 go"');

    const connect = await b.send(`${s.base}/connect/github`);
    const page = await connect.text();
    expect(page).toContain("Continue to GitHub");
    expect(page).toContain('action="/v1/oauth/github/start"');
    expect(page).toContain("Your GitHub repositories, including private ones.");
    expect(page).not.toMatch(/<code>repo<\/code>/);
    expect(connect.headers.get("content-security-policy")).toMatch(/form-action 'self' http:\/\/127\.0\.0\.1:\d+/);

    const back = await s.connect(b);
    expect(back).toMatch(/^\/\?connected=/);
    const list = await (await b.send(`${s.base}${back}`)).text();
    expect(list).toContain("Connected. Open the account");
    expect(list.match(/Not yet synced/g)).toHaveLength(1); // the status; the Last sync cell says Never
    expect(list).toContain("Never");
    const id = /href="\/accounts\/([^"]+)"/.exec(list)?.[1] ?? "";

    const acct = await (await b.send(`${s.base}/accounts/${id}`)).text();
    expect(acct).toContain("Sync now");
    expect(acct).toContain("Repository (owner/name)");
    expect([home, page, list, acct].join("")).not.toMatch(/type="password"|type="text" name="(token|secret)"/);

    const saved = await b.send(`${s.base}/accounts/${id}/repo`, form(s.base, { repo: "acme/handbook" }));
    expect(saved.headers.get("location")).toBe(`/accounts/${id}?notice=saved`);
    const synced = await b.send(`${s.base}/accounts/${id}/sync`, form(s.base));
    expect(synced.headers.get("location")).toBe(`/accounts/${id}?notice=synced`);
    const after = await (await b.send(`${s.base}/accounts/${id}?notice=synced`)).text();
    expect(after).toContain("Sync finished.");
    expect(after).toContain("Healthy");
    expect(after).not.toMatch(/Items<\/dt><dd class="big">0</);

    const gone = await b.send(`${s.base}/accounts/${id}/disconnect`, form(s.base));
    expect(gone.headers.get("location")).toBe("/?notice=disconnected");
    expect(s.store.listVisible({ user: "ann@example.com", tenant: "ann@example.com" })).toEqual([]);
  });
  it("shows an error and counts the failure when the source fails", async () => {
    const b = await s.signedIn("bea");
    const id = /connected=([^&]+)/.exec(await s.connect(b))?.[1] ?? "";
    await b.send(`${s.base}/accounts/${id}/repo`, form(s.base, { repo: "acme/missing" }));
    const res = await b.send(`${s.base}/accounts/${id}/sync`, form(s.base));
    expect(res.headers.get("location")).toBe(`/accounts/${id}?error=source`);
    const html = await (await b.send(`${s.base}/accounts/${id}`)).text();
    expect(html).toContain("Error");
    expect(html).toMatch(/Failures in a row<\/dt><dd class="big">1</);
    s.store.health.begin(id);
    expect(await (await b.send(`${s.base}/accounts/${id}`)).text()).toContain("Syncing");
    s.store.health.end(id);
    s.store.setStatus("bea@example.com", id, "needs-auth");
    expect(await (await b.send(`${s.base}/`)).text()).toContain("Needs reconnect");
  });
});
