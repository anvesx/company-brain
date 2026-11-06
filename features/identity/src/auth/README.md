# auth

The one better-auth instance and what hangs off it.

- `options.ts`: `authOptions` (every option, built before better-auth boots), `buildAuth(cfg)`, the `Auth` interface, email and password, organizations, the personal-organization hook.
- `mcp.ts`: the MCP OAuth provider (login, picker and consent pages, token lifetimes, the `org_id` claim).
- `hooks.ts`: the database hooks (personal organization, first-organization session), membership lookups used by hooks and guards, and the `identityHit` table for rate limits.
- `clients.ts`: static clients and per-client revoke.
