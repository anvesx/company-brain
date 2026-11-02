import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createFolderConnector } from "@anvesx/connector-kit";
import { createGraphStore, type GraphStore } from "@anvesx/graph-store";
import { syncConnector } from "@anvesx/graph-sync";
import { RankIndex } from "@anvesx/rank";
import { afterEach } from "vitest";
import type { Gate } from "../../src/reindex.js";
import { reindex } from "../../src/reindex.js";

export const TENANT = "t1";
const dirs: string[] = [];
const closers: Array<() => void> = [];

afterEach(() => {
  for (const c of closers.splice(0)) {
    try {
      c();
    } catch {
      // already closed by the test
    }
  }
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

export const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "integration-"));
  dirs.push(d);
  return d;
};

/** Writes a document with a body and an ACL sidecar (the folder convention). */
export const put = (root: string, address: string, body: string, users: string[] = [], groups: string[] = []): void => {
  const file = join(root, address);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
  writeFileSync(`${file}.acl.json`, JSON.stringify({ allowUsers: users, allowGroups: groups, version: 1 }));
};

export const openStore = (path: string): GraphStore => {
  const s = createGraphStore({ path });
  closers.push(() => s.close());
  return s;
};

export const openRank = (path: string): RankIndex => {
  const r = RankIndex.open(path, { key: "integration-test-key-0123456789" });
  closers.push(() => r.close());
  return r;
};

const resolve = (kind: "person" | "team", raw: string): string => `${kind === "person" ? "user" : "team"}:${raw}`;
export const deps = (store: GraphStore, root: string, id = "docs") =>
  ({ store, connector: createFolderConnector(id, root), tenant: TENANT, now: () => Date.now(), resolve }) as const;

/** One real stack in temp files: a folder of documents, a graph file and a rank file. */
export function stack(): {
  root: string;
  store: GraphStore;
  ix: RankIndex;
  known: Map<string, string>;
  sync(): ReturnType<typeof syncConnector>;
  index(gate?: Gate): ReturnType<typeof reindex>;
} {
  const [root, base] = [tmp(), tmp()];
  const store = openStore(join(base, "graph.db"));
  const ix = openRank(join(base, "rank.db"));
  const known = new Map<string, string>();
  const d = deps(store, root);
  return { root, store, ix, known, sync: () => syncConnector(d), index: (gate) => reindex({ ...d, index: ix, known, ...(gate ? { gate } : {}) }) };
}
