# Spec: connector-kit

Ticket: #31   Tier: feature   Milestone: M0   Design cards: src.rt
## Purpose
The contract every source app connector implements, a registry of connectors, and two real
connectors for tests and demos: an in-memory fake and a local-folder connector.
## Reuse decision
No new library for the contract. Production adapters will wrap `@nangohq/node` (Elastic 2.0, legal
review pending, see docs/libs/ingest-freshness.md) in a later ticket. Hash with `node:crypto`.
## Public interface
```ts
export interface Connector {
  id: string;
  list(q: { cursor?: string; limit: number }): Promise<{ items: ListedDoc[]; nextCursor?: string }>;
  fetch(address: string, ctx: { token: string }): Promise<{ text: string; version: string }>; // live text, never stored
}
export type ListedDoc = { address: string; title: string; version: string; acl: Acl; zone: Zone; updatedAt: string };
export function createConnectorRegistry(): { register(c: Connector): void; get(id: string): Connector };
export function createFakeConnector(id: string, docs: FakeDoc[]): Connector;
export function createFolderConnector(id: string, rootDir: string): Connector; // acl from a `.acl.json` sidecar, else deny-all
export const contentHash: (text: string) => string; // sha256 hex
export class ConnectorError extends Error { code: "NOT_FOUND" | "DUPLICATE" | "PATH_ESCAPE" | "BAD_CURSOR" }
```
## Behaviour
1. `register` twice with one id throws `DUPLICATE`. `get` of unknown id throws `NOT_FOUND`.
2. Paging is stable: walking `nextCursor` returns every doc exactly once, any limit 1..1000.
3. Folder connector refuses `..` and symlinks leaving the root (`PATH_ESCAPE`). Empty folder lists nothing.
4. Folder `version` is mtime+size; `fetch` returns current text so an edit changes the version.
5. Unicode file names work. A file with no ACL sidecar gets empty allow lists (deny by default).
6. A bad cursor throws `BAD_CURSOR`.
## Acceptance tests (first)
unit (registry, paging property test with fast-check), integration (temp dir tree incl. symlink escape, edit then re-list), mutation >= 80, scale (50k fake docs paged under 2 s).
## Layout
`features/connector-kit/src/{contract.ts,registry.ts,fake.ts,folder.ts,hash.ts}` (one job each; split further if a file nears 80 lines).
## Out of scope
OAuth, network connectors, webhooks.
