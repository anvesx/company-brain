import type { GraphStore } from "@anvesx/graph-store";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type GraphViewPage, visibleGraph } from "../../src/index.js";
import { bearer, boot, connect, type Env, personWithDoc } from "../support/server.js";
import { KEY, openLongStore } from "../support/store.js";

let env: Env;
let store: GraphStore;
let drop: () => void;
beforeAll(async () => {
  ({ store, drop } = openLongStore());
  env = await boot(store);
});
afterAll(async () => [await env?.close(), drop?.()]);

const page = async (res: Response): Promise<GraphViewPage> => (await res.json()) as GraphViewPage;

describe("rule 4: GET /v1/graph needs a caller", () => {
  it("answers 401 with the OAuth challenge when nobody is signed in", async () => {
    const res = await fetch(`${env.base}/v1/graph`);
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe(`Bearer resource_metadata="${env.base}/.well-known/oauth-protected-resource/mcp"`);
    expect(await res.json()).toMatchObject({ error: "unauthorized" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("answers 401 to a bearer token identity did not issue", async () => {
    expect((await fetch(`${env.base}/v1/graph`, { headers: bearer("not-a-token") })).status).toBe(401);
  });

  it("with a session cookie, returns exactly visibleGraph for that caller, uncached", async () => {
    const ada = await personWithDoc(env, store, "Ada");
    const res = await ada.browser.call("/v1/graph");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await page(res)).toEqual(visibleGraph(store, { cursorKey: KEY, tenant: ada.tenant, user: ada.user }));
  });

  it("with an MCP bearer token, returns the same graph as the session does", async () => {
    const lin = await personWithDoc(env, store, "Lin");
    const { tokens } = await connect(lin.browser, env.base, `${env.base}/mcp`);
    const res = await fetch(`${env.base}/v1/graph`, { headers: bearer(tokens.access_token) });
    expect(res.status).toBe(200);
    expect(await page(res)).toEqual(visibleGraph(store, { cursorKey: KEY, tenant: lin.tenant, user: lin.user }));
  });
});
