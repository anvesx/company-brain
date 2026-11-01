# @brain/connector-runtime

Spec: [docs/specs/service/connector-runtime.md](../../docs/specs/service/connector-runtime.md).

Polls one connector for a tenant and delivers each document change to an injected sink exactly once.
Depends only on `@brain/connector-kit`, `@brain/change-cursor` and `@brain/core-types`.

## Interface

```ts
const runtime = createConnectorRuntime({ connector, cursors, sink, clock, pageSize });
const { emitted, skipped, restarted } = await runtime.runOnce("tenant-1");
```

- `sink(event)` receives `ChangeEvent` (`tenantId`, `connectorId`, `address`, `version`, `title`, `emittedAt`).
- Event identity is `(tenant, connector, address, version)`. A modified file has a new version, so it emits once more.
- `RuntimeError.code`: `INVALID_INPUT`, `SINK_FAILED` (original error in `cause`), `BAD_CURSOR_LOOP`.
  Connector and store errors propagate unchanged.

## Behaviour

- Cursor key is `(tenant, connector.id)`. It advances only after every item on the page reached the sink.
  A finished scan stores `""`, so the next run starts from the first page and dedupe drops the unchanged items.
- Crash or sink failure: the cursor stays at the last good page. Because `seen()` cannot be undone, each item
  first adds its id to a pending list (cursor key `<connector.id>#inflight`, JSON array); a retry of a pending event bypasses `seen()`.
  A pending id for a document deleted before its retry stays in the list (4096-char cursor cap, about 60 ids).
  Delivery is at-least-once for the failed event, never lost, and never repeated once the sink succeeded.
- `BAD_CURSOR` resets the cursor and rescans from the start once. A second `BAD_CURSOR` raises `BAD_CURSOR_LOOP`.
- Tenants never share cursors, markers or seen ids.

## Limits

- `pageSize` integer 1-1000, default 100.
- Cost per item is up to 3 SQLite writes (marker, seen, marker clear). Not benchmarked.
- Do not run two `runOnce` calls for the same tenant and connector concurrently; there is no lock.
- Seen ids expire after the store's ttl (24 h default). An unchanged document is re-emitted by a scan after expiry.

## Test

```sh
pnpm --filter @brain/connector-runtime test
pnpm --filter @brain/connector-runtime typecheck
```
