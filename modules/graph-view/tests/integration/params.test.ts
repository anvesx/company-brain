import type { GraphStore } from "@anvesx/graph-store";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type GraphViewPage, visibleGraph } from "../../src/index.js";
import { boot, type Env, personWithDoc } from "../support/server.js";
import { edge, KEY, node, openLongStore, write } from "../support/store.js";

let env: Env;
let store: GraphStore;
let drop: () => void;
const aliasesOf = new Map<string, string[]>(); // what the alias function mounted with the view answers, per user
beforeAll(async () => {
  ({ store, drop } = openLongStore());
  env = await boot(store, async (user) => aliasesOf.get(user) ?? []);
});
afterAll(async () => [await env?.close(), drop?.()]);

const page = async (res: Response): Promise<GraphViewPage> => (await res.json()) as GraphViewPage;
type Person = Awaited<ReturnType<typeof personWithDoc>>;
const titles = async (who: Person) => (await page(await who.browser.call("/v1/graph"))).nodes.map((n) => n.title);

describe("tenant isolation and query parameters on /v1/graph", () => {
  it("each person sees only their own tenant, even when both hold a document with the same id", async () => {
    const [a, b] = [await personWithDoc(env, store, "Grace"), await personWithDoc(env, store, "Alan")];
    expect(a.tenant).not.toBe(b.tenant);
    expect(await titles(a)).toContain("Grace doc");
    expect(await titles(a)).not.toContain("Alan doc");
    expect(await titles(b)).not.toContain("Grace doc");
  });

  it("tenant and user always come from the caller; query parameters cannot widen the view", async () => {
    const [a, b] = [await personWithDoc(env, store, "Mary"), await personWithDoc(env, store, "Joan")];
    const res = await a.browser.call(`/v1/graph?tenant=${encodeURIComponent(b.tenant)}&user=${encodeURIComponent(b.user)}`);
    expect((await page(res)).nodes.map((n) => n.title)).not.toContain("Joan doc");
  });

  it("limit and cursor page the same graph visibleGraph returns", async () => {
    const k = await personWithDoc(env, store, "Kay");
    const first = await page(await k.browser.call("/v1/graph?limit=1"));
    expect(first.nodes).toHaveLength(1);
    const rest = await page(await k.browser.call(`/v1/graph?limit=1&cursor=${encodeURIComponent(String(first.next))}`));
    const whole = await visibleGraph(store, { cursorKey: KEY, tenant: k.tenant, user: k.user });
    expect([...first.nodes, ...rest.nodes]).toEqual(whole.nodes);
  });

  it("asOf passes through: before the rows were written the graph is empty", async () => {
    const k = await personWithDoc(env, store, "Rosalind");
    expect((await page(await k.browser.call("/v1/graph?asOf=0"))).nodes).toEqual([]);
  });

  // Only plain digits are numbers: "+5", "5e2", "0x10" and "1e3" all pass Number() but are not what a person types.
  it.each([
    ["limit", ["0", "20001", "abc", "1.5", "+5", "5e2", "0x10", "1e3"]],
    ["asOf", ["", "-1", "abc", "1.5", "+5", "5e2", "0x10", "1e3"]],
  ] as const)("a bad %s is a 400 that is not cached", async (name, bads) => {
    const k = await personWithDoc(env, store, `Bad${name}`);
    for (const bad of bads) {
      const res = await k.browser.call(`/v1/graph?${name}=${bad}`);
      expect([bad, res.status, res.headers.get("cache-control")]).toEqual([bad, 400, "no-store"]);
    }
  });

  it("a cursor this view did not issue, or issued to someone else, is a 400", async () => {
    const [a, b] = [await personWithDoc(env, store, "Hedy"), await personWithDoc(env, store, "Lise")];
    const next = encodeURIComponent(String((await page(await a.browser.call("/v1/graph?limit=1"))).next));
    expect((await a.browser.call(`/v1/graph?limit=1&cursor=${next}`)).status).toBe(200);
    for (const cursor of ["Zm9v", "Zm9v.AAAA", "x", next]) {
      expect([cursor, (await b.browser.call(`/v1/graph?limit=1&cursor=${cursor}`)).status]).toEqual([cursor, 400]);
    }
  });

  it("a document whose ACL names an alias of the caller is visible only while the alias function returns it", async () => {
    const z = await personWithDoc(env, store, "Zed");
    write(store, 1, [node(z.tenant, "d-alias", "document", "gdrive", { title: "Zed alias doc" })], [edge(z.tenant, "zed@example.com", "d-alias", "can-read")]);
    expect(await titles(z)).not.toContain("Zed alias doc");
    aliasesOf.set(z.user, ["zed@example.com"]);
    const seen = await page(await z.browser.call("/v1/graph"));
    expect(seen.nodes.map((n) => n.title)).toContain("Zed alias doc");
  });
});
