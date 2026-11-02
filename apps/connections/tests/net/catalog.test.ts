import { afterEach, describe, expect, it } from "vitest";
import { boot, root } from "../http/fixture.js";

const wiki = { id: "wiki", name: "Team Wiki", auth: { kind: "token" }, endpoint: "https://wiki.example.com/c" };
const oauth = (tokenURL: string) => ({ kind: "oauth2", authorizeURL: "https://w.example.com/a", tokenURL, scopes: [] });
let s: Awaited<ReturnType<typeof boot>>;
afterEach(() => s.close());
const post = (b: unknown) => s.call("POST", "/v1/catalog", root, b);

describe("POST /v1/catalog refuses internal targets", () => {
  it("refuses endpoints and token urls on private, link-local, metadata and loopback addresses", async () => {
    s = await boot();
    const bad = ["https://169.254.169.254/latest", "https://10.0.0.5/c", "https://[::1]/c", "https://[::ffff:192.168.0.1]/c", "http://127.0.0.1:9/c"];
    for (const u of bad) {
      expect((await post({ ...wiki, endpoint: u })).status, `endpoint ${u}`).toBe(400);
      expect((await post({ ...wiki, auth: oauth(u) })).status, `tokenURL ${u}`).toBe(400);
    }
    const listed = (await (await s.call("GET", "/v1/catalog", root)).json()) as { providers: { id: string }[] };
    expect(listed.providers.map((p) => p.id)).not.toContain("wiki");
  });
  it("refuses a name that resolves inside the network, checked at registration", async () => {
    s = await boot({ net: { resolve: async () => ["10.1.2.3"] } });
    const r = await post(wiki);
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ error: expect.stringContaining("10.1.2.3") });
    expect((await post({ ...wiki, id: "w2", auth: oauth("https://idp.example.com/t") })).status).toBe(400);
  });
  it("takes a loopback http endpoint only when the server is started with allowLoopback", async () => {
    s = await boot({ net: { allowLoopback: true } });
    expect((await post({ ...wiki, endpoint: "http://127.0.0.1:9/c" })).status).toBe(201);
    expect((await post({ ...wiki, id: "w2", endpoint: "http://10.0.0.5/c" })).status).toBe(400);
  });
});
