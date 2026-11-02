import { createHmac } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createGraphStore } from "@anvesx/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { createBrainApp } from "../../src/app.js";
import { runSync } from "../../src/cli/sync.js";

const SECRET = "k".repeat(32);
const tok = (user: string, tenant = "acme") => {
  const exp = 5_000;
  return `Bearer ${user}:${tenant}:${exp}:${createHmac("sha256", SECRET).update(`${user}:${tenant}:${exp}`).digest("hex")}`;
};
const put = (root: string, rel: string, users: string[], groups: string[] = []) => {
  const f = join(root, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, "SECRET BODY TEXT");
  writeFileSync(`${f}.acl.json`, JSON.stringify({ allowUsers: users, allowGroups: groups, version: 1 }));
};
let stop: (() => Promise<void>) | undefined;
afterEach(async () => stop?.());

describe("connect, sync, then ask", () => {
  it("fills the graph from a real folder and serves pointers with no text", async () => {
    const dir = mkdtempSync(join(tmpdir(), "brain-e2e-"));
    const root = join(dir, "src");
    put(root, "plan.md", ["ana"]);
    put(root, "eng/design.md", ["bo"]);
    const dbPath = join(dir, "graph.db");
    const report = await runSync({ BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: root, BRAIN_TENANT: "acme", BRAIN_GRAPH_PATH: dbPath }, () => 1000);
    expect(report.removed).toBe(0);
    expect(report.nodes).toBeGreaterThan(0);

    const app = createBrainApp({ store: createGraphStore({ path: dbPath }), secret: SECRET, now: () => 1000, port: 0 });
    await app.listen();
    stop = app.close;
    const base = `http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;
    const ask = async (u: string) => (await fetch(`${base}/v1/documents`, { headers: { authorization: tok(u) } })).text();
    const ana = await ask("ana");
    expect(JSON.parse(ana).documents.map((d: { id: string }) => d.id)).toEqual(["folder/plan.md"]);
    expect(ana).not.toContain("SECRET BODY TEXT");
    expect(JSON.parse(await ask("bo")).documents.map((d: { id: string }) => d.id)).toEqual(["folder/eng/design.md"]);
    expect(JSON.parse(await ask("zed")).documents).toEqual([]);
  });
  it("fails clearly for a missing connector or tenant", async () => {
    await expect(runSync({ BRAIN_GRAPH_PATH: "x.db" }, () => 0)).rejects.toThrow(/BRAIN_TENANT/);
    await expect(runSync({ BRAIN_TENANT: "a", BRAIN_GRAPH_PATH: "x.db", BRAIN_CONNECTOR: "folder" }, () => 0)).rejects.toThrow(/BRAIN_FOLDER_ROOT/);
    await expect(runSync({ BRAIN_TENANT: "a", BRAIN_GRAPH_PATH: "x.db", BRAIN_CONNECTOR: "nope" }, () => 0)).rejects.toThrow(/BRAIN_CONNECTOR/);
  });
});
