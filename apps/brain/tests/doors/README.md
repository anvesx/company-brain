# doors

The doors `src/doors` opens, proven on the real app: Google login on the sign-in pages, the connector
tiles on `/connections`, and the MCP server at `/mcp`.

- `env.test.ts`: `doorsFromEnv` pairs the Google secrets, validates or derives the seal key; the built
  binary refuses a bad value in one line before any database is made.
- `google.test.ts`: with Google credentials the sign-in and sign-up pages show "Continue with Google"
  and the click reaches the provider; without them the button is absent.
- `tiles.test.ts`: the catalog shows every connector; a tile is greyed "not configured" until its
  `<ID>_CLIENT_ID` and `<ID>_CLIENT_SECRET` are set, then it gets a Connect form.
- `mcp.test.ts`: `/mcp` answers the MCP initialize handshake for the bearer token identity issued,
  refuses a request without one, and `brain.connectors` lists the caller's linked accounts.
