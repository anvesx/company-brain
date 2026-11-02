import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGraphStore } from "@anvesx/graph-store";
import { describe, expect, it } from "vitest";
import { runSync } from "../../src/cli/sync.js";

function folder() {
  const dir = mkdtempSync(join(tmpdir(), "brain-sync-"));
  const root = join(dir, "src");
  mkdirSync(root);
  writeFileSync(join(root, "a.md"), "x");
  writeFileSync(join(root, "a.md.acl.json"), JSON.stringify({ allowUsers: ["ana"], allowGroups: [], version: 1 }));
  return { root, db: join(dir, "g.db") };
}

describe("runSync", () => {
  it("requires a graph path", async () => {
    await expect(runSync({ BRAIN_TENANT: "t", BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: "/tmp" }, () => 0)).rejects.toThrow("BRAIN_GRAPH_PATH is required");
  });
  it("stamps the graph with the clock in milliseconds", async () => {
    const { root, db } = folder();
    await runSync({ BRAIN_TENANT: "t", BRAIN_GRAPH_PATH: db, BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: root }, () => 1000);
    const store = createGraphStore({ path: db });
    const at = (asOf: number) => store.neighbors("t", "folder/a.md", { kind: "belongs-to", dir: "out", asOf }).length;
    expect(at(999_999)).toBe(0);
    expect(at(1_000_000)).toBe(1);
    store.close();
  });
  it("leaves a graph that a second sync can reopen", async () => {
    const { root, db } = folder();
    const env = { BRAIN_TENANT: "t", BRAIN_GRAPH_PATH: db, BRAIN_CONNECTOR: "folder", BRAIN_FOLDER_ROOT: root };
    await runSync(env, () => 1);
    const again = await runSync(env, () => 2);
    expect(again.removed).toBe(0);
  });
});
