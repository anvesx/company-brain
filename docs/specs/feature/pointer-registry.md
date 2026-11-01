# Spec: pointer-registry

Ticket: #30   Tier: feature   Milestone: M0   Design cards: idx.reg
## Purpose
Store one pointer row per document: where it is, its version, hash, zone and ACL. Never body text.
## Reuse decision
`drizzle-orm@0.45.4` + `better-sqlite3@13.0.3` (embedded, zero servers). Same table definitions
move to `pg@8.23.1` later. We write only the registry functions and the schema.
## Public interface
```ts
export interface Registry {
  upsert(p: Pointer): { pointer: Pointer; change: "created" | "updated" | "unchanged" };
  get(tenantId: string, id: string): Pointer | undefined;
  list(q: { tenantId: string; afterId?: string; limit?: number }): Pointer[]; // limit default 100, max 1000
  tombstone(tenantId: string, id: string, at: string): boolean; // true if a live row was marked
}
export function createRegistry(dbPath: string): Registry; // ":memory:" allowed
export class RegistryError extends Error { code: "INVALID" | "TENANT_REQUIRED" }
```
## Behaviour
1. Key is (tenantId, id). `upsert` validates with `PointerSchema`; invalid input throws `RegistryError("INVALID")`.
2. Same hash, version and acl.version means `unchanged` and no write. Otherwise `updated`.
3. Every method needs a non-empty tenantId; no cross-tenant read is possible.
4. `tombstone` sets deletedAt; the row stays. `list` and `get` hide tombstoned rows unless re-upserted.
5. Table has no column that can hold body text. Test asserts the exact column list.
6. Concurrent upserts of the same key end with one row (use a transaction + unique key).
7. Unicode ids and 2048 char addresses work. `list` pages by id, stable order.
## Acceptance tests (first)
- unit: change detection, validation errors, tenant isolation, tombstone, paging.
- integration: file-backed db survives reopen; 1000 upserts from 4 interleaved loops give 1000 rows.
- mutation: score >= 80.   scale: 100k upserts under 30 s, list page under 20 ms (record numbers in README).
## Layout
`features/pointer-registry/{src/{schema.ts,registry.ts,errors.ts,index.ts},tests/{unit,integration,scale},README.md,package.json,...}` copy configs from `features/core-types`.
## Out of scope
Postgres adapter, search, ACL checks.
