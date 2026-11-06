# signed

Pages that need a signed-in session.

- `guard.ts`: `signedInPages(d)`, the adapter and the `signedIn` wrapper (no session goes to `/sign-in`).
- `connections.ts`: `/connections`, the organization, connections or catalog, and the install guide.
- `account.ts`: `/account` lists allowed MCP clients; `POST /account/revoke` removes one.
- `accountView.ts`: the account page HTML.
