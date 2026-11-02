import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach } from "vitest";
import type { Edge, GraphNode, GraphStore } from "../../src/index.js";
import { createGraphStore } from "../../src/index.js";

const dirs: string[] = [];
const stores: GraphStore[] = [];

afterEach(() => {
  for (const s of stores.splice(0)) {
    try {
      s.close();
    } catch {
      // already closed by the test
    }
  }
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

/** A fresh temp directory removed after each test. */
export function tmpDir(): string {
  const d = mkdtempSync(join(tmpdir(), "graph-store-"));
  dirs.push(d);
  return d;
}

/** A real SQLite file store in a temp dir, closed after each test. */
export function openStore(path = join(tmpDir(), "g.db")): GraphStore {
  const s = createGraphStore({ path });
  stores.push(s);
  return s;
}

export const node = (id: string, over: Partial<GraphNode> = {}): GraphNode => ({
  tenant: "t1",
  id,
  kind: "document",
  source: "gdrive",
  address: `addr/${id}`,
  title: `Title ${id}`,
  version: "1",
  props: {},
  ...over,
});

export const edge = (from: string, to: string, over: Partial<Edge> = {}): Edge => ({ tenant: "t1", from, to, kind: "links-to", source: "gdrive", ...over });

export function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return (e as { code?: string }).code;
  }
  return undefined;
}
