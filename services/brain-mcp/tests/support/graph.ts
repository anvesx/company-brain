import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, sep } from "node:path";
import { createGraphStore, type EdgeKind, type GraphStore, type NodeKind } from "@anvesx/graph-store";
import { afterAll } from "vitest";

/** Every temp folder a test made. Registering here is what gets it deleted when the file's tests end. */
const made: string[] = [];
export const track = (dir: string): string => {
  made.push(dir);
  return dir;
};

/** Deletes tracked folders. It refuses any path outside the OS temp dir, so a bad value can never remove real files. */
afterAll(() => {
  for (const dir of made.splice(0)) {
    if (!dir.startsWith(tmpdir() + sep)) throw new Error(`refusing to delete outside os.tmpdir(): ${dir}`);
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A fresh graph in its own SQLite file under the OS temp dir. Never `:memory:` (fake-guard). */
export const tempStore = (): GraphStore => createGraphStore({ path: join(track(mkdtempSync(join(tmpdir(), "brain-mcp-"))), "graph.sqlite") });

/** Times the seed writes at, so asOf reads have a known before and after. */
export const T0 = 1_000;
export const T1 = 2_000;

export const node = (store: GraphStore, tenant: string, id: string, kind: NodeKind, title: string, at = T0) =>
  store.upsertNode({ tenant, id, kind, source: kind === "document" ? "drive" : "directory", address: `x://${id}`, title, version: "1", props: {} }, at);

export const edge = (store: GraphStore, tenant: string, from: string, kind: EdgeKind, to: string, at = T0) =>
  store.addEdge({ tenant, from, to, kind, source: "directory" }, at);

/**
 * One organisation with two people. Ada reads through her team, Bob reads alone.
 *   ada -member-of-> team-eng -can-read-> doc-plan -belongs-to-> proj-atlas
 *   bob -can-read-> doc-secret (Ada cannot read it)        chan-general -mentions-> doc-plan (channels never show)
 *   doc-pct "Budget 50% cut" and doc-num "Budget 500 cut" and doc-und "a_b notes" and doc-axb "axb notes", all readable by team-eng
 * doc-plan is renamed at T1, so asOf between T0 and T1 sees the old title.
 */
export function seedOrg(store: GraphStore, tenant: string, ada: string, bob: string) {
  node(store, tenant, ada, "person", "Ada Lovelace");
  node(store, tenant, bob, "person", "Bob Builder");
  node(store, tenant, "team-eng", "team", "Engineering");
  edge(store, tenant, ada, "member-of", "team-eng");
  node(store, tenant, "proj-atlas", "project", "Atlas");
  node(store, tenant, "doc-plan", "document", "Quarterly plan draft");
  node(store, tenant, "doc-plan", "document", "Quarterly plan final", T1);
  edge(store, tenant, "team-eng", "can-read", "doc-plan");
  edge(store, tenant, "doc-plan", "belongs-to", "proj-atlas");
  node(store, tenant, "doc-secret", "document", "Quarterly layoffs secret");
  edge(store, tenant, bob, "can-read", "doc-secret");
  node(store, tenant, "chan-general", "channel", "general quarterly chatter");
  edge(store, tenant, "chan-general", "mentions", "doc-plan");
  for (const [id, title] of [
    ["doc-pct", "Budget 50% cut"],
    ["doc-num", "Budget 500 cut"],
    ["doc-und", "a_b notes"],
    ["doc-axb", "axb notes"],
  ]) {
    node(store, tenant, id as string, "document", title as string);
    edge(store, tenant, "team-eng", "can-read", id as string);
  }
  return { visible: ["doc-plan", "proj-atlas", "team-eng", ada], hidden: ["doc-secret", "chan-general"] };
}
