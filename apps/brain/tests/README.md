# tests

Tests for the brain app, one folder per area of `src/`.

- `http.test.ts`: boots the server on a free port and calls it with `fetch`.
- `http-edges.test.ts`: json errors, exact document paths, hidden non-document nodes, a generic 500 and short secrets.
- `recheck.test.ts`: the permission recheck drops, fails closed on a throw, or does nothing when unset.
- `gate/`: bearer token and graph access rules.
- `live/`: the optional recheck against the source.
- `cli/`: the `connector`, `recheck` and `sync` commands.
- `e2e/`: connect, sync, then ask.
