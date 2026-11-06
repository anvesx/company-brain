# grant

Rule 7 through the whole grant: authorize, consent page, Allow, token exchange, `/mcp`.

- `heal.test.ts`: the session's active organization is stale or empty (member removed, organization deleted, user left).
  The consent page shows the user's remaining organization, the token's `org_id` is that same organization, `/mcp`
  accepts it, and the session row is corrected. A user with no organization gets NO_ORGANIZATION.
