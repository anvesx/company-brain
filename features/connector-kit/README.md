# @brain/connector-kit

The connector contract for Company Brain sources. It exposes metadata for indexing while fetching
document text live, so callers do not need to persist source content. The package also provides a
registry, SHA-256 hashing, an in-memory fake, and a local-folder adapter.

## Interface

- `Connector.list({ cursor, limit })` returns stable metadata pages; limits are integers from 1–1000.
- `Connector.enforcesUserToken` is true only when `fetch` really checks the token against the source. The fake and folder connectors declare `false`; a live ACL refuses connectors without `true`.
- `Connector.fetch(address, { token, signal? })` returns current UTF-8 text and its source version.
- `createConnectorRegistry()` rejects duplicate ids and unknown lookups with typed errors.
- `createFakeConnector(id, docs)` snapshots fixtures for deterministic tests and demos.
- `createFolderConnector(id, rootDir)` recursively reads a local folder without storing content.
- `contentHash(text)` returns a lowercase SHA-256 hex digest.

`ListedDoc` contains address, title, version, ACL, trust zone, and ISO update time. `FakeDoc` adds
the text returned by `fetch`. `ConnectorError.code` is `NOT_FOUND`, `DUPLICATE`, `PATH_ESCAPE`, `FORBIDDEN` (401/403 at the source), or
`BAD_CURSOR`.

## Usage

```ts
import { createFolderConnector, contentHash } from "@brain/connector-kit";

const connector = createFolderConnector("handbook", "/srv/handbook");
const { items, nextCursor } = await connector.list({ limit: 100 });
const live = await connector.fetch(items[0]!.address, { token: "request-token" });
console.log(contentHash(live.text), nextCursor);
```

## Folder convention

A document at `policies/leave.md` may have `policies/leave.md.acl.json` containing an `Acl` object:

```json
{ "allowUsers": ["u1"], "allowGroups": ["hr"], "version": 3 }
```

Missing sidecars become `{ allowUsers: [], allowGroups: [], version: 0 }` (deny by default).
Folder documents use the `personal` zone. Versions are `<mtimeMs>:<size>:<content digest>:<acl fingerprint>`; each digest is the first 16 hex characters of a
SHA-256, over the document text and over the ACL (users, groups, version), so a same-size edit or a sidecar-only edit changes the version. Traversal and any file
or ACL symlink resolving outside the configured root throw `PATH_ESCAPE`.

## Limits and operation

A `list` call without a cursor rescans the tree and starts a walk with its own snapshot; pages fetched
with that walk's cursor reuse it, so a full walk costs one scan (5,000 files page in about 2 s) and
concurrent walks do not disturb each other. Cursors are opaque (`<walkId>:<offset>`). At most 16
walks stay open per connector, the oldest is evicted, and a walk is dropped after its last page. A cursor
this instance did not issue, or whose walk finished or was evicted, throws `BAD_CURSOR`; restart without a
cursor to see concurrent filesystem changes.
The adapter follows internal symlinks once and suppresses directory cycles. Files must be UTF-8;
malformed ACL JSON or ACL schema failures are surfaced unchanged. OAuth, networks, and webhooks are
outside this package. The `token` argument exists for production adapters; the fake and folder
adapters do not authenticate it.

## Verify

Run from this folder:

```sh
pnpm test
pnpm typecheck
pnpm mutation
```

Tests cover registry errors, property-based paging, live edits, Unicode, deny-by-default ACLs,
path and symlink escapes, empty folders, paging 50,000 fake documents under two seconds, and linear-time folder walks over 5,000 files and
200-level nesting.
