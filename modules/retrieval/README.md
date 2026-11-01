# @brain/retrieval

One call that wires `@brain/query-service` into `@brain/mcp-service`. Spec: `docs/specs/module/retrieval.md`.

```ts
import { createRetrieval } from "@brain/retrieval";

const retrieval = await createRetrieval({
  index, // @brain/hybrid-search index
  registry, // @brain/pointer-registry registry
  principalFor: (extra) => principalFromAuthHeader(extra), // throws when unauthenticated
  embedQuery: async (text) => embed(text), // same model and dimension as the index
  audit, // REQUIRED: @brain/audit-service; every search writes a row before results return
  auditKey: process.env.AUDIT_KEY, // REQUIRED non-empty master secret for the keyed target digest
  transport: "http", // or "stdio"
  port: 0, // http only; read retrieval.port
});
await retrieval.close();
```

## Behaviour

1. The MCP `search` tool embeds the query with `embedQuery`, then calls the query service with the caller's principal.
2. ACL, tenant and tombstone enforcement is the query service's job; hidden documents are never returned.
3. Unauthenticated HTTP requests get `401` from the MCP service.
4. Audited and fail closed: after the query runs, one row `{ actor, action: "search", target, detail: { count } }` is written under the caller's tenant, then results return. If the write fails, the search fails and no pointers are returned.
5. `target` is `HMAC-SHA256(HMAC-SHA256(auditKey, tenant), trimmed query)`. The raw query is never stored. Same digest as `@brain/governance`.
6. Missing `audit` or empty `auditKey` throws `RetrievalError` `CONFIG` at construction (`createRetrieval` rejects). Nothing is served unaudited.
7. An `embedQuery` failure, a wrong-dimension vector, any query-service error, or an audit failure becomes the MCP error `Search failed`. The cause goes only to the optional `logger`. Failed searches leave no row.

`@brain/governance` cannot be imported here (modules do not depend on modules), so the audit wrapper in `src/audit.ts` is a small deliberate copy of its logic.

## Limits

Embedding runs in the caller's function; this module ships no model. The tool caps `limit` at 50 and the query at 2000 characters.

## Test

`pnpm test`, `pnpm typecheck`, `pnpm mutation` from this folder. Tests use in-memory databases and a real HTTP MCP client. Build the dependencies first (core-types, acl-filter, hybrid-search, pointer-registry, mcp-search-tool, query-service, mcp-service).
