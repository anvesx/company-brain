import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { skip } from "../../../../../features/google-identity/tests/support/db.js";
import { bootUi } from "../harness.js";

let s: Awaited<ReturnType<typeof bootUi>>;
beforeAll(async () => {
  if (!skip) s = await bootUi();
});
afterAll(() => s?.close());

const form = (body: Record<string, string> = {}) => ({
  method: "POST",
  headers: { origin: s.base, "content-type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams(body).toString(),
});
const idOf = (back: string) => /connected=([^&]+)/.exec(back)?.[1] ?? "";

describe.skipIf(skip)("the account page, repository and reconnect", () => {
  it("explains and disables Sync until a repository is set, and a missing one is not a failure", async () => {
    const b = await s.signedIn("hal");
    const id = idOf(await s.connect(b));
    const html = await (await b.send(`${s.base}/accounts/${id}`)).text();
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Sync now/);
    expect(html).toContain("Set a repository below");
    const res = await b.send(`${s.base}/accounts/${id}/sync`, form());
    expect(res.headers.get("location")).toBe(`/accounts/${id}?error=input`);
    expect(s.store.health.read("hal@example.com", id).failures).toBe(0);
  });
  it("clears the repository with an explicit button", async () => {
    const b = await s.signedIn("ivy");
    const id = idOf(await s.connect(b));
    expect(await (await b.send(`${s.base}/accounts/${id}`)).text()).not.toContain("Clear repository");
    await b.send(`${s.base}/accounts/${id}/repo`, form({ repo: "acme/handbook" }));
    expect(await (await b.send(`${s.base}/accounts/${id}`)).text()).toContain("Clear repository");
    const res = await b.send(`${s.base}/accounts/${id}/repo`, form({ repo: "" }));
    expect(res.headers.get("location")).toBe(`/accounts/${id}?notice=cleared`);
    expect(s.store.get("ivy@example.com", id)?.repo).toBeNull();
  });
  it("offers Reconnect when the sign-in is refused, and signing in again renews the same account", async () => {
    const b = await s.signedIn("jon");
    const id = idOf(await s.connect(b));
    await b.send(`${s.base}/accounts/${id}/repo`, form({ repo: "acme/handbook" }));
    s.store.setStatus("jon@example.com", id, "needs-auth");
    const page = await b.send(`${s.base}/accounts/${id}`);
    const html = await page.text();
    expect(html).toContain('action="/v1/oauth/github/start"');
    expect(html).toContain("Reconnect GitHub");
    expect(html).not.toContain("Set a repository below");
    expect(html).not.toMatch(/<button[^>]*>Sync now/);
    expect(page.headers.get("content-security-policy")).toMatch(/form-action 'self' http:\/\/127\.0\.0\.1:\d+/);
    expect(idOf(await s.connect(b))).toBe(id);
    expect(s.store.listVisible({ user: "jon@example.com", tenant: "jon@example.com" })).toHaveLength(1);
    const now = s.store.get("jon@example.com", id);
    expect([now?.status, now?.repo]).toEqual(["active", "acme/handbook"]);
  });
  it("asks before disconnecting, on its own step with a way back", async () => {
    const b = await s.signedIn("lou");
    const id = idOf(await s.connect(b));
    const plain = await (await b.send(`${s.base}/accounts/${id}`)).text();
    expect(plain).not.toContain(`/accounts/${id}/disconnect`);
    const ask = await (await b.send(`${s.base}/accounts/${id}?confirm=1`)).text();
    expect(ask).toContain(`action="/accounts/${id}/disconnect"`);
    expect(ask).toContain("Keep it");
    expect(ask).not.toContain("<details");
  });
  it("says the connection could not be saved when our own store fails, and logs the cause", async () => {
    const b = await s.signedIn("meg");
    const create = vi.spyOn(s.store, "create").mockImplementation(() => {
      throw new Error("disk full");
    });
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const back = await s.connect(b);
    expect(back).toBe("/?oauth_error=store");
    expect(log).toHaveBeenCalledWith("oauth callback: could not store the account", expect.objectContaining({ message: "disk full" }));
    create.mockRestore();
    log.mockRestore();
    expect(await (await b.send(`${s.base}${back}`)).text()).toContain("Could not save the connection, try again.");
  });
});
