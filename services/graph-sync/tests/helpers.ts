import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createFolderConnector } from "@anvesx/connector-kit";
import type { Acl } from "@anvesx/core-types";
import { createGraphStore, type GraphStore } from "@anvesx/graph-store";
import { afterEach } from "vitest";
import type { SyncDeps } from "../src/index.js";

const dirs: string[] = [];
const stores: GraphStore[] = [];

afterEach(() => {
  for (const s of stores.splice(0)) {
    try {
      s.close();
    } catch {
      // closed by the test
    }
  }
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

export const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "graph-sync-"));
  dirs.push(d);
  return d;
};

export const openStore = (path = join(tmp(), "g.db")): GraphStore => {
  const s = createGraphStore({ path });
  stores.push(s);
  return s;
};

/** Writes a document and its ACL sidecar under `root`. */
export const put = (root: string, address: string, users: string[] = [], groups: string[] = []): void => {
  const file = join(root, address);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `text of ${address}`);
  const acl: Acl = { allowUsers: users, allowGroups: groups, version: 1 };
  writeFileSync(`${file}.acl.json`, JSON.stringify(acl));
};

/** Removes a document and its ACL sidecar. */
export const drop = (root: string, address: string): void => {
  rmSync(join(root, address), { force: true });
  rmSync(join(root, `${address}.acl.json`), { force: true });
};

/** A counter clock: every call returns the next integer; `jump` moves it. */
export const ticker = (from = 1000) => {
  let t = from;
  return Object.assign(() => ++t, {
    jump: (to: number): void => {
      t = to;
    },
  });
};

export const setup = (tenant = "t1", store: GraphStore = openStore(), root = tmp()) => {
  const connector = createFolderConnector("folder", root);
  const now = ticker();
  const deps: SyncDeps = { store, connector, tenant, now };
  return { store, root, connector, now, deps };
};

/** Ids that can read `doc`, sorted. */
export const readers = (store: GraphStore, tenant: string, doc: string, asOf?: number): string[] =>
  store
    .neighbors(tenant, doc, { kind: "can-read", dir: "in", ...(asOf === undefined ? {} : { asOf }) })
    .map((e) => e.from)
    .sort();
