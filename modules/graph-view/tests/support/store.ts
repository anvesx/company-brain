import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createGraphStore, type Edge, type EdgeKind, type GraphNode, type GraphStore, type NodeKind } from "@anvesx/graph-store";
import { afterEach } from "vitest";

/** The cursor key every suite signs with: 32 bytes, as mountGraphView and visibleGraph require. */
export const KEY = new Uint8Array(32).fill(7);

// Every store a test opens is a real SQLite file in its own temp folder. No in-memory database:
// the graph view must work against the same file format the brain ships with.
const open: { store: GraphStore; dir: string }[] = [];

afterEach(() => {
  for (const { store, dir } of open.splice(0)) {
    try {
      store.close();
    } catch {
      // the test closed it already
    }
    rmSync(dir, { recursive: true, force: true });
  }
});

/** A fresh graph store on disk, closed and deleted after the test. */
export function openStore(): GraphStore {
  const dir = mkdtempSync(join(tmpdir(), "graph-view-"));
  const store = createGraphStore({ path: join(dir, "graph.db") });
  open.push({ store, dir });
  return store;
}

/** A store that outlives one test (the scale suite builds it once in beforeAll). The caller closes it. */
export function openLongStore(): { store: GraphStore; drop: () => void } {
  const dir = mkdtempSync(join(tmpdir(), "graph-view-scale-"));
  const store = createGraphStore({ path: join(dir, "graph.db") });
  const drop = (): void => {
    store.close();
    rmSync(dir, { recursive: true, force: true });
  };
  return { store, drop };
}

/**
 * A node row. `address`, `version` and `props` are filled with values the view must never send,
 * so a test can search the JSON for them and prove they stayed on the server.
 */
export const node = (tenant: string, id: string, kind: NodeKind, source: string, over: Partial<GraphNode> = {}): GraphNode => ({
  tenant,
  id,
  kind,
  source,
  address: `https://private.example.com/${id}`,
  title: `Title of ${id}`,
  version: `v-${id}`,
  props: { secret: `prop-of-${id}` },
  ...over,
});

/** An edge row. The source connector does not matter to the view, so it is fixed. */
export const edge = (tenant: string, from: string, to: string, kind: EdgeKind): Edge => ({ tenant, from, to, kind, source: "test" });

/** Writes many nodes and edges at one time stamp. */
export function write(store: GraphStore, at: number, nodes: GraphNode[], edges: Edge[]): void {
  for (const n of nodes) store.upsertNode(n, at);
  for (const e of edges) store.addEdge(e, at);
}

/** Edges as sortable strings, so tests compare sets without caring about order. */
export const edgeKeys = (edges: { from: string; to: string; kind: string }[]): string[] => edges.map((e) => `${e.from} -${e.kind}-> ${e.to}`).sort();

/** Person u in tenant t1 can read `docs` documents d00000.., and each document links to the next one. */
export function chain(store: GraphStore, docs: number): void {
  const ids = Array.from({ length: docs }, (_, i) => `d${String(i).padStart(5, "0")}`);
  const links = ids.slice(1).map((id, i) => edge("t1", ids[i] as string, id, "links-to"));
  const reads = ids.map((id) => edge("t1", "u", id, "can-read"));
  write(store, 1, [node("t1", "u", "person", "slack"), ...ids.map((id) => node("t1", id, "document", "gdrive"))], [...reads, ...links]);
}
