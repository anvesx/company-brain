import { afterEach, describe, expect, it } from "vitest";
import { ann, boot, mint, root } from "../http/fixture.js";

const wiki = { id: "wiki", name: "Team Wiki", auth: { kind: "token" }, endpoint: "https://wiki.example.com/connector" };
let s: Awaited<ReturnType<typeof boot>>;
afterEach(() => s.close());
const ids = async (who: string) => ((await (await s.call("GET", "/v1/catalog", who)).json()) as { providers: { id: string }[] }).providers.map((p) => p.id);

describe("GET and POST /v1/catalog", () => {
  it("needs a bearer and lists the built-in apps with what the page needs", async () => {
    s = await boot();
    expect((await s.call("GET", "/v1/catalog")).status).toBe(401);
    const r = await s.call("GET", "/v1/catalog", ann);
    const { providers } = (await r.json()) as { providers: Record<string, unknown>[] };
    const row = (id: string, name: string, needsRepo: boolean) => ({
      ...{ id, name, auth: "oauth2", kinds: ["oauth", "pat", "admin-token"], defaultZone: "team" },
      ...{ custom: false, liveRecheck: true, needsRepo },
    });
    expect(providers).toEqual([row("github", "GitHub", true), row("drive", "Google Drive", false)]);
  });
  it("lets only a tenant admin register, and shows the entry to that tenant only", async () => {
    s = await boot();
    const other = mint("root", "t2");
    expect((await s.call("POST", "/v1/catalog", ann, wiki)).status).toBe(403);
    const made = await s.call("POST", "/v1/catalog", root, wiki);
    expect(made.status).toBe(201);
    expect(await made.json()).toMatchObject({
      id: "wiki",
      custom: true,
      auth: "token",
      kinds: ["admin-token", "pat"],
      liveRecheck: false,
      defaultZone: "personal",
    });
    expect(await ids(ann)).toEqual(["github", "drive", "wiki"]);
    expect(await ids(other)).toEqual(["github", "drive"]);
    expect((await s.call("POST", "/v1/accounts", mint("ann", "t2"), { provider: "wiki", label: "w", kind: "pat", token: "x" })).status).toBe(400);
  });
  it("refuses a duplicate or built-in id with 409 and bad bodies with 400", async () => {
    s = await boot();
    await s.call("POST", "/v1/catalog", root, wiki);
    expect((await s.call("POST", "/v1/catalog", root, wiki)).status).toBe(409);
    expect((await s.call("POST", "/v1/catalog", root, { ...wiki, id: "github" })).status).toBe(409);
    const bad: unknown[] = [
      null,
      { ...wiki, id: "Bad:Id" },
      { ...wiki, name: "" },
      { ...wiki, auth: { kind: "basic" } },
      { ...wiki, endpoint: "ftp://x" },
      { ...wiki, endpoint: "http://wiki.example.com" },
      { ...wiki, defaultZone: "company" },
      { ...wiki, extra: 1 },
      { ...wiki, auth: { kind: "oauth2", authorizeURL: "https://a", tokenURL: "nope", scopes: [] } },
      { ...wiki, auth: { kind: "oauth2", app: "google", authorizeURL: "https://a", tokenURL: "https://t", scopes: [] } },
    ];
    for (const b of bad) expect((await s.call("POST", "/v1/catalog", root, b)).status, JSON.stringify(b)).toBe(400);
  });
  it("accepts an oauth2 manifest and a loopback http endpoint", async () => {
    s = await boot();
    const auth = { kind: "oauth2", authorizeURL: "https://w.example.com/a", tokenURL: "https://w.example.com/t", scopes: ["read"] };
    const r = await s.call("POST", "/v1/catalog", root, { ...wiki, id: "wiki2", auth, endpoint: "http://127.0.0.1:9/c", canRead: true, defaultZone: "team" });
    expect(r.status).toBe(201);
    expect(await r.json()).toMatchObject({ auth: "oauth2", kinds: ["oauth", "pat", "admin-token"], liveRecheck: true, defaultZone: "team" });
  });
});
