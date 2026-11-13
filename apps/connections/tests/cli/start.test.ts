import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { start } from "../../src/cli/start.js";
import { mint, NOW } from "../http/fixture.js";
import { dataEnv } from "../pg/db.js";

const dirs: string[] = [];
const stops: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const s of stops.splice(0)) await s();
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});
const env = () => {
  const dir = mkdtempSync(join(tmpdir(), "conn-start-"));
  dirs.push(dir);
  return {
    dir,
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

describe("start", () => {
  it("serves the API with the configured admins, over real files", async () => {
    const e = env();
    const s = await start(e.env, () => NOW);
    stops.push(s.close);
    const call = (who: string, zone: string) =>
      fetch(`http://127.0.0.1:${s.port}/v1/accounts`, {
        method: "POST",
        headers: { authorization: who, "content-type": "application/json" },
        body: JSON.stringify({ provider: "github", label: "x", kind: "pat", token: "ghp_1", dataZone: zone }),
      });
    expect((await fetch(`http://127.0.0.1:${s.port}/v1/accounts`)).status).toBe(401);
    expect((await call(mint("root", "t1"), "company")).status).toBe(201);
    expect((await call(mint("ann", "t1"), "company")).status).toBe(403);
    expect(existsSync(e.env.CONNECTIONS_DB_PATH) && existsSync(e.env.CONNECTIONS_GRAPH_PATH)).toBe(true);
  });
  it("refuses bad config before opening anything", async () => {
    const e = env();
    await expect(start({ ...e.env, CONNECTOR_VAULT_KEYS: "short" }, () => NOW)).rejects.toThrow(/CONNECTOR_VAULT_KEYS/);
    expect(existsSync(e.env.CONNECTIONS_DB_PATH)).toBe(false);
  });
  it("fails when the database path cannot be opened, and leaves no half-started server", async () => {
    const e = env();
    await expect(start({ ...e.env, CONNECTIONS_DB_PATH: join(e.dir, "no", "such", "c.db") }, () => NOW)).rejects.toThrow();
  });
});
