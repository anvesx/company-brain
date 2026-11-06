import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { serve } from "../../../src/serve/serve.js";
import { bearer, connect, signUp } from "../../identity/boot.js";
import { env, freePort, until } from "../boot.js";
import { seed, whoIs } from "../session.js";

// OAuth needs identity's issuer URL to carry the port the server listens on, so this server gets a fixed free port.
let db: Throwaway | undefined;
let running: Awaited<ReturnType<typeof serve>> | undefined;
let base = "";
let token = "";
beforeAll(async () => {
  try {
    db = await startPostgres();
  } catch (e) {
    if (process.env["CI"] === "true") throw e;
    return console.warn(`serve oauth tests skipped: ${(e as Error).message}`);
  }
  const port = await freePort();
  base = `http://localhost:${port}`;
  const cfg = { ...env(db.url), PORT: String(port), BASE_URL: base };
  running = await serve(cfg, () => {});
  await until(async () => (await fetch(`${base}/healthz`)).status === 200, 30_000);
  const ann = await signUp({ base }, "Ann");
  await seed(db.url, await whoIs(db.url, ann.browser.cookie(), cfg));
  token = (await connect(ann.browser, base, `${base}/mcp`)).tokens.access_token;
}, 90_000);
afterAll(async () => {
  await running?.close();
  db?.stop();
});

const documents = (headers: HeadersInit) => fetch(`${base}/v1/documents`, { headers });
const challenge = () => `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource/mcp"`;

const forgeries: [string, () => string][] = [
  ["a made-up token", () => "not-a-jwt"],
  ["the real token with its signature changed", () => `${token.slice(0, -4)}${token.endsWith("AAAA") ? "BBBB" : "AAAA"}`],
  ["the old hand-signed bearer format", () => `ann:t:${Date.now() + 60_000}:${"a".repeat(64)}`],
];

describe("MCP OAuth bearer on /v1/documents, serve over Postgres", () => {
  it("answers the bearer identity issued with the person's documents", async (ctx) => {
    if (!running) return ctx.skip();
    const res = await documents(bearer(token));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { documents: { id: string }[] }).documents.map((d) => d.id)).toEqual(["d1"]);
  });

  it.for(forgeries)("answers 401 with the challenge for $0", async ([, forged], ctx) => {
    if (!running) return ctx.skip();
    const res = await documents(bearer(forged()));
    expect(res.status).toBe(401);
    expect(res.headers.get("www-authenticate")).toBe(challenge());
  });

  it("answers 401 with the challenge when there is no credential at all", async (ctx) => {
    if (!running) return ctx.skip();
    const res = await documents({});
    expect([res.status, res.headers.get("www-authenticate")]).toEqual([401, challenge()]);
  });
});
