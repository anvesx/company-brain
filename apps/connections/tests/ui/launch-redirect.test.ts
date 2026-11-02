import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { start } from "../../src/cli/start.js";
import { NOW } from "../http/fixture.js";

const dirs: string[] = [];
const stops: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const s of stops.splice(0)) await s();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const boot = async (opts?: Parameters<typeof start>[2]) => {
  const dir = mkdtempSync(join(tmpdir(), "conn-ui-"));
  dirs.push(dir);
  const env = {
    CONNECTIONS_KEY: "ab".repeat(32),
    CONNECTIONS_AUTH_SECRET: "s".repeat(32),
    CONNECTIONS_DB_PATH: join(dir, "c.db"),
    CONNECTIONS_GRAPH_PATH: join(dir, "g.db"),
    CONNECTIONS_PORT: "0",
  };
  const s = await start(env, () => NOW, opts);
  stops.push(s.close);
  return fetch(`http://127.0.0.1:${s.port}/v1/oauth/github/callback?state=nope`, { redirect: "manual" });
};

describe("the launcher and the page", () => {
  it("sends a failed OAuth callback back to the page when the launcher asks for it", async () => {
    const r = await boot({ uiRedirect: "/" });
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toMatch(/^\/\?oauth_error=/);
  });
  it("keeps the json answer without that option", async () => expect((await boot()).status).toBe(400));
});
