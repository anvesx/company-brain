import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGraphStore } from "@brain/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { fixture, startReplay } from "../../../../services/connectors/tests/support/replay.js";
import { start } from "../../src/cli/start.js";
import { mint, NOW } from "../http/fixture.js";

const R = "/repos/acme/handbook";
const ok = (n: string) => ({ status: 200, body: fixture(n) });
const ghRoutes = {
  [R]: ok("github/repo"),
  [`${R}/git/trees/main`]: ok("github/tree"),
  [`${R}/git/trees/9fb037999f264ba9281fc6cbd2d9dff8d1c1d5b1`]: ok("github/tree"),
  [`${R}/collaborators`]: ok("github/collaborators"),
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
      CONNECTIONS_KEY: "ab".repeat(32),
      CONNECTIONS_AUTH_SECRET: "s".repeat(32),
      CONNECTIONS_DB_PATH: join(dir, "c.db"),
      CONNECTIONS_GRAPH_PATH: join(dir, "g.db"),
      CONNECTIONS_ADMINS: "t1:root",
      CONNECTIONS_PORT: "0",
      CONNECTIONS_TOKENS_FILE: join(dir, "tokens.json"),
    },
  };
};

describe("launcher wiring", () => {
  it("writes the token file on start, rewrites it on disconnect, and frees the port on close", async () => {
    const e = env();
    const first = await start(e.env, () => NOW);
    const url = `http://127.0.0.1:${first.port}/v1/accounts`;
    const h = { authorization: mint("root", "t1"), "content-type": "application/json" };
    const body = { provider: "github", label: "x", kind: "pat", token: "ghp_tok", dataZone: "company" };
    const { id } = (await (await fetch(url, { method: "POST", headers: h, body: JSON.stringify(body) })).json()) as { id: string };
    await first.close();
    await expect(fetch(url)).rejects.toThrow();
    rmSync(e.env.CONNECTIONS_TOKENS_FILE);
    const again = await start(e.env, () => NOW);
    stops.push(again.close);
    expect(readFileSync(e.env.CONNECTIONS_TOKENS_FILE, "utf8")).toContain("ghp_tok");
    const del = await fetch(`http://127.0.0.1:${again.port}/v1/accounts/${id}`, { method: "DELETE", headers: h });
    expect(del.status).toBe(204);
    expect(JSON.parse(readFileSync(e.env.CONNECTIONS_TOKENS_FILE, "utf8"))).toEqual({});
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
    expect(g.node("t1", "README.md")?.props).toMatchObject({ zone: "company" });
    g.close();
  });
});
