import type { GraphStore } from "@anvesx/graph-store";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { GraphViewPage } from "../../../src/index.js";
import { mountGraphView } from "../../../src/index.js";
import { another, boot, type Env, personWithDoc } from "../../support/server.js";
import { edge, KEY, node, openLongStore, write } from "../../support/store.js";

// Two servers stand in for two Cloud Run instances: one graph file, one identity, one session cookie.
let env: Env;
let store: GraphStore;
let drop: () => void;
beforeAll(async () => {
  ({ store, drop } = openLongStore());
  env = await boot(store);
});
afterAll(async () => [await env?.close(), drop?.()]);

const getPage = async (res: Response): Promise<GraphViewPage> => (await res.json()) as GraphViewPage;

/** A person who can read 15 documents in a chain: 16 nodes and 14 links, 1 can-read edge per document too. */
async function reader(name: string) {
  const p = await personWithDoc(env, store, name);
  const ids = Array.from({ length: 15 }, (_, i) => `c${String(i).padStart(2, "0")}`);
  write(
    store,
    2,
    ids.map((id) => node(p.tenant, id, "document", "gdrive")),
    [...ids.slice(1).map((id, i) => edge(p.tenant, ids[i] as string, id, "links-to")), ...ids.map((id) => edge(p.tenant, p.user, id, "can-read"))],
  );
  return p;
}

describe("a cursor works on any instance that shares the key", () => {
  it("pages alternate between two servers and still add up to one page: same nodes, same edges", async () => {
    const [p, other] = [await reader("Ida"), await another(env, store, KEY)];
    const whole = await getPage(await p.browser.call("/v1/graph"));
    const nodes: GraphViewPage["nodes"] = [];
    const edges: GraphViewPage["edges"] = [];
    let next: string | undefined;
    // Even pages come from the first server, odd pages from the second.
    for (let turn = 0; turn === 0 || next !== undefined; turn++) {
      const base = turn % 2 === 0 ? env.base : other.base;
      const url = `${base}/v1/graph?limit=4${next ? `&cursor=${encodeURIComponent(next)}` : ""}`;
      const res = await fetch(url, { headers: p.browser.headers() });
      expect(res.status).toBe(200);
      const page = await getPage(res);
      nodes.push(...page.nodes);
      edges.push(...page.edges);
      next = page.next;
    }
    await other.close();
    expect(nodes).toEqual(whole.nodes);
    expect([nodes.length, edges.length]).toEqual([whole.nodes.length, whole.edges.length]);
    expect(new Set(edges.map((e) => `${e.from}>${e.kind}>${e.to}`)).size).toBe(edges.length);
  });

  it("a server with a different key answers an old cursor with 400", async () => {
    const [p, other] = [await reader("Jan"), await another(env, store, new Uint8Array(32).fill(9))];
    const first = await getPage(await p.browser.call("/v1/graph?limit=4"));
    const res = await fetch(`${other.base}/v1/graph?limit=4&cursor=${encodeURIComponent(String(first.next))}`, { headers: p.browser.headers() });
    await other.close();
    expect(res.status).toBe(400);
  });
});

describe("the key is checked when the view is mounted", () => {
  const mount = (cursorKey: Uint8Array) => () => mountGraphView(new Hono(), { store, port: env.identity.port, cursorKey });
  it.each([31, 33, 0])("refuses a %i-byte key with GraphError BAD_INPUT", (bytes) => {
    expect(mount(new Uint8Array(bytes))).toThrow(expect.objectContaining({ name: "GraphError", code: "BAD_INPUT" }));
  });
  it("accepts a 32-byte key", () => {
    expect(mount(new Uint8Array(32))).not.toThrow();
  });
});
