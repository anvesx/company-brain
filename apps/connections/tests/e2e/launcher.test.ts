import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fixture, startReplay } from "@anvesx/connectors/testing/replay";
import { createGraphStore } from "@anvesx/graph-store";
import pg from "pg";
import { afterEach, describe, expect, it } from "vitest";
import { start } from "../../src/cli/start.js";
import { mint, NOW } from "../http/fixture.js";
import { databaseUrl, dataEnv } from "../pg/db.js";

const R = "/repos/acme/handbook";
const ok = (n: string) => ({ status: 200, body: fixture(n) });
const ghRoutes = {
  [R]: ok("github/repo"),
  [`${R}/git/trees/main`]: ok("github/tree"),
  [`${R}/git/trees/9fb037999f264ba9281fc6cbd2d9dff8d1c1d5b1`]: ok("github/tree"),
  [`${R}/collaborators`]: ok("github-members/collaborators"),
  [`${R}/teams`]: { status: 404, body: {} },
};
const dirs: string[] = [];
const stops: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const s of stops.splice(0)) await s();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const env = () => {
  const dir = mkdtempSync(join(tmpdir(), "conn-launch-"));
  dirs.push(dir);
  return {
    env: {
      ...dataEnv(),
      CONNECTIONS_AUTH_SECRET: "s".repeat(32),
      CONNECTIONS_DB_PATH: join(dir, "c.db"),
      CONNECTIONS_GRAPH_PATH: join(dir, "g.db"),
      CONNECTIONS_ADMINS: "t1:root",
      CONNECTIONS_PORT: "0",
    },
  };
};

describe("launcher wiring", () => {
  it("keeps the sealed token across a restart, removes it on disconnect, and frees the port on close", async () => {
    const e = env();
    const first = await start(e.env, () => NOW);
    const url = `http://127.0.0.1:${first.port}/v1/accounts`;
    const h = { authorization: mint("root", "t1"), "content-type": "application/json" };
    const body = { provider: "github", label: "x", kind: "pat", token: "ghp_tok", dataZone: "company" };
    const { id } = (await (await fetch(url, { method: "POST", headers: h, body: JSON.stringify(body) })).json()) as { id: string };
    await first.close();
    await expect(fetch(url)).rejects.toThrow();
    const again = await start(e.env, () => NOW);
    stops.push(again.close);
    const pool = new pg.Pool({ connectionString: databaseUrl() });
    const sealed = async () => (await pool.query("SELECT sealed FROM connector_tokens WHERE id = $1", [id])).rows;
    expect(await sealed()).toHaveLength(1);
    expect(JSON.stringify(await sealed())).not.toContain("ghp_tok");
    const del = await fetch(`http://127.0.0.1:${again.port}/v1/accounts/${id}`, { method: "DELETE", headers: h });
    expect(del.status).toBe(204);
    expect(await sealed()).toEqual([]);
    await pool.end();
  });
  it("syncs into the configured graph through the configured GitHub API", async () => {
    const e = env();
    const gh = await startReplay(ghRoutes);
    stops.push(gh.close);
    const s = await start({ ...e.env, CONNECTIONS_GITHUB_API_URL: gh.url }, () => NOW);
    stops.push(s.close);
    const h = { authorization: mint("root", "t1"), "content-type": "application/json" };
    const body = { provider: "github", label: "x", kind: "pat", token: "ghp_tok", dataZone: "company" };
    const { id } = (await (await fetch(`http://127.0.0.1:${s.port}/v1/accounts`, { method: "POST", headers: h, body: JSON.stringify(body) })).json()) as {
      id: string;
    };
    const r = await fetch(`http://127.0.0.1:${s.port}/v1/accounts/${id}/sync`, { method: "POST", headers: h, body: JSON.stringify({ repo: "acme/handbook" }) });
    expect(r.status).toBe(200);
    const g = createGraphStore({ path: e.env.CONNECTIONS_GRAPH_PATH });
    expect(g.node("t1", `github:${id}/README.md`)?.props).toMatchObject({ zone: "company" });
    g.close();
  });
});
