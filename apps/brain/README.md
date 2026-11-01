# @brain/brain-app

The runnable Devx Brain server. Spec: `docs/specs/app/brain.md`. It composes ingestion, governed search and the MCP server; it adds no core logic.

```ts
const app = await createBrainApp({
  connector,
  cursors,
  clock,
  embed,
  embedQuery,
  fetchText,
  principalFor,
  auditDbPath,
  anchorPath,
  transport: "http",
  port: 0,
});
await app.ingest("tenant-1"); // connector -> index
await app.search({ query, principal }); // audited, same path as MCP
await app.verify("tenant-1"); // audit chain check
await app.checkpoint("tenant-1"); // anchor, so truncation is detectable
await app.close(); // idempotent, frees the port
```

## Behaviour

- Every search, whether over MCP or `app.search`, goes through governance and writes one audit row.
- ACL, tenant and tombstone rules come from the query service. Unauthenticated HTTP gets `401`.
- The registry and search index are in memory. Only the audit chain and anchors are files.
- Vector size is measured by embedding one probe text at startup unless `dimension` is given.

## Run

`BRAIN_DEMO=1 BRAIN_PORT=3000 node dist/bin.js`. Without `BRAIN_DEMO=1` it exits 1, since no real connector is wired. Other variables: `BRAIN_AUDIT_DB`, `BRAIN_ANCHOR`. Demo token: `Bearer alice:acme`.

## Limits

- `@brain/retrieval` cannot take an injected search function (it builds its own query service from `index` and `registry`), so the app starts `@brain/mcp-service` directly with a governance-backed search. Retrieval is not used.
- Index and registry are lost on restart; re-run `ingest`.

## Test

`pnpm test`, `pnpm typecheck`, `pnpm mutation` from this folder. Build the dependencies first.
