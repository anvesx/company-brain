import { createServer, request } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { startPostgres, type Throwaway } from "../../../../../features/graph-store/tests/support/pg/server.js";
import { KEEP_ALIVE_MS, tune } from "../../../src/serve/mount.js";
import { serve } from "../../../src/serve/serve.js";
import { bootBrain } from "../../identity/boot.js";
import { env } from "../boot.js";

// Node closes an idle keep-alive socket after 5 s by default, which races a proxy that reuses it (ECONNRESET, 502).
// The production server must outlast the proxies in front of it (docs/specs/infra/deploy.md, "Keep-alive").
const keepAliveHeader = (port: number) =>
  new Promise<string | undefined>((ok, no) => {
    const req = request({ port, host: "127.0.0.1", path: "/healthz", headers: { connection: "keep-alive" }, agent: false }, (res) => {
      res.resume();
      res.on("end", () => ok(res.headers["keep-alive"] as string | undefined));
    });
    req.on("error", no).end();
  });

describe("keep-alive limits", () => {
  it("tune raises only keepAliveTimeout; headersTimeout stays at Node's 60 s, under requestTimeout", () => {
    const server = tune(createServer());
    expect(server.keepAliveTimeout).toBe(620_000);
    expect(KEEP_ALIVE_MS).toBeGreaterThan(600_000); // above Google's 600 s backend keep-alive
    // headersTimeout bounds a slow-header client, not an idle socket. Node's createServer rejects headersTimeout above
    // requestTimeout (ERR_OUT_OF_RANGE), and assigning it afterwards would only dodge that check, so it is left alone.
    expect(server.headersTimeout).toBe(60_000);
    expect(server.headersTimeout).toBeLessThanOrEqual(server.requestTimeout);
    expect(() => createServer({ headersTimeout: 625_000, requestTimeout: 300_000 })).toThrow(/ERR_OUT_OF_RANGE|headersTimeout/);
  });

  it("the local brain app (SQLite) tells a keep-alive client 620 s too, not Node's 5 s default", async () => {
    const env = await bootBrain();
    try {
      expect(await keepAliveHeader(Number(new URL(env.base).port))).toBe("timeout=620");
    } finally {
      await env.close();
    }
  });

  describe("serve() on Postgres", () => {
    let db: Throwaway | undefined;
    let running: Awaited<ReturnType<typeof serve>> | undefined;
    beforeAll(async () => {
      db = await startPostgres().catch((e) => (process.env["CI"] === "true" ? Promise.reject(e) : undefined));
      if (db) running = await serve(env(db.url), () => {});
    }, 90_000);
    afterAll(async () => {
      await running?.close();
      db?.stop();
    });

    it("tells a keep-alive client the idle timeout is 620 s (Node sends the server's keepAliveTimeout)", async (ctx) => {
      if (!running) return ctx.skip();
      expect(await keepAliveHeader(running.port)).toBe("timeout=620");
    });
  });
});
