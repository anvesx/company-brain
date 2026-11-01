# @brain/retrieval

One call that wires `@brain/query-service` into `@brain/mcp-service`. Spec: `docs/specs/module/retrieval.md`.

```ts
import { createRetrieval } from "@brain/retrieval";

const retrieval = await createRetrieval({
  index, // @brain/hybrid-search index
  registry, // @brain/pointer-registry registry
  principalFor: (extra) => principalFromAuthHeader(extra), // throws when unauthenticated
  embedQuery: async (text) => embed(text), // same model and dimension as the index
  transport: "http", // or "stdio"
  port: 0, // http only; read retrieval.port
});
await retrieval.close();
```

## Behaviour

1. The MCP `search` tool embeds the query with `embedQuery`, then calls the query service with the caller's principal.
2. ACL, tenant and tombstone enforcement is the query service's job; hidden documents are never returned.
3. Unauthenticated HTTP requests get `401` from the MCP service.
4. An `embedQuery` failure, a wrong-dimension vector, or any query-service error becomes the MCP error `Search failed`. The cause goes only to the optional `logger`.

## Limits

Embedding runs in the caller's function; this module ships no model. The tool caps `limit` at 50 and the query at 2000 characters.

## Test

`pnpm test`, `pnpm typecheck`, `pnpm mutation` from this folder. Tests use in-memory databases and a real HTTP MCP client. Build the dependencies first (core-types, acl-filter, hybrid-search, pointer-registry, mcp-search-tool, query-service, mcp-service).
