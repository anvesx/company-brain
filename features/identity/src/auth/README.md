# auth

The one better-auth instance and what hangs off it.

- `options.ts`: `buildAuth(cfg)`, the `Auth` interface, email and password, organizations, the personal-organization hook.
- `mcp.ts`: the MCP OAuth provider (login, picker and consent pages, token lifetimes, the `org_id` claim).
- `hooks.ts`: membership lookups used by hooks and guards, and the `identityHit` table for rate limits.
- `clients.ts`: static clients and per-client revoke.
