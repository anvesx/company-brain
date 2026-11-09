import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createGraphStore } from "@anvesx/graph-store";
import { afterEach, describe, expect, it } from "vitest";
import { runSync } from "../../src/cli/sync.js";
import { bootBrain, type Env, signUp, whoIs } from "../identity/boot.js";

const put = (root: string, rel: string, users: string[], groups: string[] = []) => {
  const f = join(root, rel);
  mkdirSync(dirname(f), { recursive: true });
  writeFileSync(f, "SECRET BODY TEXT");
  writeFileSync(`${f}.acl.json`, JSON.stringify({ allowUsers: users, allowGroups: groups, version: 1 }));
};
let env: Env | undefined;
afterEach(async () => {
  await env?.close();
  env = undefined;
});

describe("connect, sync, then ask", () => {
  it("fills the graph from a real folder and serves pointers with no text", async () => {
    const dir = mkdtempSync(join(tmpdir(), "brain-e2e-"));
    const dbPath = join(dir, "graph.db");
    // The brain serves the same graph file the sync writes. People are real identity sign-ups, so the
    // folder's ACLs name their user ids, and the sync runs for the tenant identity gave Ana.
    const store = createGraphStore({ path: dbPath });
    env = await bootBrain({ store });
    const ana = await signUp(env, "Ana");
    const zed = await signUp(env, "Zed");
    const { tenant, user } = await whoIs(env, ana.browser.cookie());
    const root = join(dir, "src");
    put(root, "plan.md", [user]);
    put(root, "eng/design.md", ["bo"]);
    const report = await runSync({ BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: root, BRAIN_TENANT: tenant, BRAIN_GRAPH_PATH: dbPath }, () => 1000);
    expect(report.removed).toBe(0);
    expect(report.nodes).toBeGreaterThan(0);

    const ask = async (who: typeof ana) => (await fetch(`${env?.base}/v1/documents`, { headers: { cookie: who.browser.cookie() } })).text();
    const text = await ask(ana);
    expect(JSON.parse(text).documents.map((d: { id: string }) => d.id)).toEqual(["folder/plan.md"]);
    expect(text).not.toContain("SECRET BODY TEXT");
    // Zed is in another tenant with a document of his own: he sees that and nothing from Ana's folder.
    const z = await whoIs(env, zed.browser.cookie());
    store.upsertNode({ tenant: z.tenant, id: "zed-only", kind: "document", source: "drive", address: "z", title: "z", version: "1", props: {} }, 1);
    store.upsertNode({ tenant: z.tenant, id: z.user, kind: "person", source: "drive", address: z.user, title: "Zed", version: "1", props: {} }, 1);
    store.addEdge({ tenant: z.tenant, from: z.user, to: "zed-only", kind: "can-read", source: "drive" }, 1);
    expect(JSON.parse(await ask(zed)).documents.map((d: { id: string }) => d.id)).toEqual(["zed-only"]);
    expect(JSON.parse(await ask(ana)).documents.map((d: { id: string }) => d.id)).toEqual(["folder/plan.md"]);
  });
  it("fails clearly for a missing connector or tenant", async () => {
    await expect(runSync({ BRAIN_GRAPH_PATH: "x.db" }, () => 0)).rejects.toThrow(/BRAIN_TENANT/);
    await expect(runSync({ BRAIN_TENANT: "a", BRAIN_GRAPH_PATH: "x.db", BRAIN_CONNECTOR: "folder" }, () => 0)).rejects.toThrow(/BRAIN_FOLDER_ROOT/);
    await expect(runSync({ BRAIN_TENANT: "a", BRAIN_GRAPH_PATH: "x.db", BRAIN_CONNECTOR: "nope" }, () => 0)).rejects.toThrow(/BRAIN_CONNECTOR/);
  });
});
