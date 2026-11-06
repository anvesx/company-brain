# tests

Tests for the brain app, one folder per area of `src/`.

- `http.test.ts`: boots the brain with real identity on a free port and calls it with a sign-up session cookie.
- `http-edges.test.ts`: json errors, exact document paths, hidden non-document nodes, and a generic 500.
- `recheck.test.ts`: the permission recheck drops, fails closed on a throw, or does nothing when unset.
- `gate/`: graph access rules.
- `live/`: the optional recheck against the source.
- `cli/`: the `connector`, `recheck` and `sync` commands.
- `e2e/`: connect, sync, then ask as a signed-up person.
- `identity/`: frozen contract. `/v1/documents` and the graph view behind identity: a session cookie
  or an MCP bearer, otherwise 401 with the challenge header (ADR 0008).
