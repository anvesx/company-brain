# grant

Rule 7 through the whole grant: authorize, consent page, Allow, token exchange, `/mcp`.

- `heal.test.ts`: the session's active organization is stale or empty (member removed, organization deleted, user left).
  The consent page shows the user's remaining organization, the token's `org_id` is that same organization, `/mcp`
  accepts it, and the session row is corrected. A user with no organization gets NO_ORGANIZATION.
- `noorg.test.ts`: a user who has left every organization (through the API, not the database) opens the authorize URL
  in a browser. Rule 12: they are sent to the consent page, which renders NO_ORGANIZATION as HTML; no code is issued.
