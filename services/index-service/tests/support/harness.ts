import { createHash } from "node:crypto";
import { chunkText } from "@brain/chunker";
import type { Pointer } from "@brain/core-types";
import { createSearchIndex } from "@brain/hybrid-search";
import { createRegistry } from "@brain/pointer-registry";
import { createIndexService, type IndexDeps } from "../../src/index.js";

export function pointer(over: Partial<Pointer> = {}): Pointer {
  return {
    id: "d1",
    tenantId: "acme",
    source: "drive",
    address: "drive://d1",
    title: "Doc",
    version: "v1",
    contentHash: "a".repeat(64),
    zone: "team",
    acl: { allowUsers: ["u1"], allowGroups: [], version: 1 },
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...over,
  } as Pointer;
}

export const embedText = (t: string) => [t.length % 7, 1, t.charCodeAt(0) % 5];

export function setup(texts: Record<string, string>, over: Partial<IndexDeps> = {}) {
  const registry = createRegistry(":memory:");
  const index = createSearchIndex(":memory:", 3);
  const calls = { fetch: 0, embed: 0 };
  const deps: IndexDeps = {
    registry,
    index,
    chunk: (docId, text) => chunkText(docId, text, { size: 40, overlap: 5 }),
    fetchText: async (p) => {
      calls.fetch++;
      return texts[`${p.tenantId}/${p.id}@${p.version}`] ?? "";
    },
    embed: async (ts) => {
      calls.embed++;
      return ts.map(embedText);
    },
    ...over,
  };
  const search = (tenantId: string, text: string, user = "u1") =>
    index.search({
      text,
      embedding: [1, 1, 1],
      limit: 50,
      acl: { sql: "tenant_id = ? AND allow_users LIKE ?", params: [tenantId, `%"${user}"%`] },
    });
  /** True when the exact single-chunk text of `docId` is searchable by `user` in `tenantId`. */
  const has = (tenantId: string, docId: string, body: string, user = "u1") => {
    const id = createHash("sha256")
      .update(JSON.stringify([docId, 0, body]))
      .digest("hex");
    return search(tenantId, body, user).some((h) => h.chunkId === id && h.docId === docId);
  };
  const count = (tenantId: string, user = "u1") => search(tenantId, "x", user).length;
  return { registry, index, calls, search, has, count, svc: createIndexService(deps) };
}

export const A = "alpha beta gamma";
export const B = "delta epsilon zeta";
export const T = { "acme/d1@v1": A, "acme/d1@v2": B };
export const v2 = pointer({ version: "v2", contentHash: "b".repeat(64) });
export const boom = async () => Promise.reject(new Error("x"));

/** An env where d1@v1 is indexed, plus a service whose deps are overridden over the same stores. */
export async function seeded(over: Partial<IndexDeps>) {
  const env = setup(T);
  await env.svc.apply({ type: "upsert", pointer: pointer() });
  const broken = setup(T, { ...over, registry: env.registry, index: env.index });
  return { ...env, svc: broken.svc };
}
