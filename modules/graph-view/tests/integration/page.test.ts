import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Browser, boot, type Env, signUp } from "../support/server.js";
import { openLongStore } from "../support/store.js";

let env: Env;
let drop: () => void;
beforeAll(async () => {
  const opened = openLongStore();
  drop = opened.drop;
  env = await boot(opened.store);
});
afterAll(async () => [await env?.close(), drop?.()]);

/** Every <script ...> opening tag in the page, so tests can check sources and types. */
const scriptTags = (html: string): string[] => html.match(/<script\b[^>]*>/g) ?? [];

describe("rule 4: GET /graph needs a session", () => {
  it("sends a visitor with no session to /sign-in", async () => {
    const res = await new Browser(env.base).call("/graph");
    expect(res.status).toBe(302);
    expect(new URL(String(res.headers.get("location")), env.base).pathname).toBe("/sign-in");
  });

  it("a bearer token is not a session: the page still redirects", async () => {
    const res = await fetch(`${env.base}/graph`, { headers: { authorization: "Bearer x" }, redirect: "manual" });
    expect(res.status).toBe(302);
  });
});

describe("rule 5: the page shell", () => {
  it("renders HTML with the graph element, the library, the page script and nothing inline but the import map", async () => {
    const { browser } = await signUp(env, "Ada");
    const res = await browser.call("/graph");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/html/);
    const html = await res.text();
    expect(html).toMatch(/<[a-z]+[^>]*\bid="graph"/);
    const tags = scriptTags(html);
    expect(tags.some((t) => t.includes('src="/3d-force-graph.js"'))).toBe(true);
    expect(tags.some((t) => t.includes('src="/graph.js"'))).toBe(true);
    // Identity rule 12 carried over: no inline JavaScript. The import map is data, not code.
    expect(tags.filter((t) => !t.includes("src=") && !t.includes('type="importmap"'))).toEqual([]);
    expect(html).toContain('"three": "/vendor/three/build/three.module.js"');
  });

  it("a signed-in page is never cached: /graph answers cache-control no-store", async () => {
    const { browser } = await signUp(env, "NoStore");
    expect((await browser.call("/graph")).headers.get("cache-control")).toBe("no-store");
  });

  it("sends a Content-Security-Policy that allows this origin's files and the import map by hash, no other inline script, no framing", async () => {
    const { browser } = await signUp(env, "Csp");
    const csp = (await browser.call("/graph")).headers.get("content-security-policy");
    const map = (await (await browser.call("/graph")).text()).match(/<script type="importmap">([^<]*)<\/script>/)?.[1] ?? "";
    const hash = `'sha256-${createHash("sha256").update(map).digest("base64")}'`;
    expect(csp?.split("; ")).toEqual([
      "default-src 'self'",
      `script-src 'self' ${hash}`,
      "style-src 'self'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
    ]);
  });

  it("serves the page script as a file", async () => {
    const res = await fetch(`${env.base}/graph.js`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^text\/javascript/);
    const code = await res.text();
    for (const api of ["ForceGraph3D", "onEngineStop", "warmupTicks", "cooldownTicks", "postProcessingComposer", "UnrealBloomPass", "/v1/graph"]) {
      expect(code).toContain(api);
    }
  });
});
