import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { database, skip } from "../../../../../features/google-identity/tests/support/db.js";
import { startOidc } from "../../../../../features/google-identity/tests/support/oidc/provider.js";
import { start } from "../../../src/cli/start.js";
import { NOW } from "../../http/fixture.js";

let dir: string;
let db: Awaited<ReturnType<typeof database>>;
let oidc: Awaited<ReturnType<typeof startOidc>>;
let running: Awaited<ReturnType<typeof start>>;
beforeAll(async () => {
  if (skip) return;
  dir = mkdtempSync(join(tmpdir(), "conn-login-"));
  db = await database();
  oidc = await startOidc("cid", "csecret", "http://127.0.0.1:9/api/auth/callback/google");
  const url = new URL(process.env["DATABASE_URL"] ?? "");
  url.pathname = `/${(await db.pool.query<{ current_database: string }>("SELECT current_database()")).rows[0]?.current_database}`;
  running = await start(
    {
      CONNECTIONS_KEY: "ab".repeat(32),
      CONNECTIONS_AUTH_SECRET: "s".repeat(32),
      CONNECTIONS_DB_PATH: join(dir, "c.db"),
      CONNECTIONS_GRAPH_PATH: join(dir, "g.db"),
      CONNECTIONS_PORT: "0",
      CONNECTIONS_PUBLIC_URL: "http://127.0.0.1:9",
      LOGIN_DATABASE_URL: url.toString(),
      LOGIN_SECRET: "0123456789abcdef0123456789abcdef-test-secret",
      LOGIN_GOOGLE_CLIENT_ID: "cid",
      LOGIN_GOOGLE_CLIENT_SECRET: "csecret",
      LOGIN_GOOGLE_ISSUER: oidc.issuer,
    },
    () => NOW,
  );
});
afterAll(async () => {
  await running?.close();
  await oidc?.close();
  await db?.close();
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe.skipIf(skip)("start with Google sign-in configured", () => {
  it("serves /sign-in, and / sends a stranger there", async () => {
    const base = `http://127.0.0.1:${running.port}`;
    expect((await fetch(`${base}/sign-in`)).status).toBe(200);
    const r = await fetch(`${base}/`, { redirect: "manual" });
    expect([r.status, r.headers.get("location")]).toEqual([302, "/sign-in"]);
  });
});
