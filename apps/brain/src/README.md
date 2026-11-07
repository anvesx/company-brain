# src

- `app.ts`: `createBrainApp({ store, identity, cursorKey, recheck?, port?, host? })`, a Hono app on `@hono/node-server`. It mounts identity's routes, the documents API, the graph view and the MCP server (`/mcp`) on one origin, over an `AsyncGraphStore`. It returns `handler` (a Node request listener) for `serve/` to mount.
- `bin.ts`: reads env and runs `sync`, `serve` (Postgres, production) or, with no argument, the local SQLite server (graph and auth databases, wrapped in `toAsync`).
- `index.ts`: public exports.
- `serve/`: both entries. Local: `readServeConfig` (checks every env setting first, `ConfigError`) and `startBrain` (databases, identity, listen). Production: `serve` (Postgres pool, identity mount, `/healthz`). See its README.
- `routes/`: `/v1/documents` behind `identity.protect` (pointers only) and the guard that shapes its 401.
- `gate/`: who may read which documents, from `can-read` and `member-of` edges
- `live/`: optional per-query permission recheck against the source
- `cli/`: the `connector`, `recheck` and `sync` commands
- `doors/`: the connector catalog and `doorsFromEnv`: Google login, per-connector secrets and the seal key, read from env for both entries

Env for `bin.ts`: `BRAIN_GRAPH_PATH`, `BRAIN_AUTH_DB` (SQLite file for sign-in data), `BRAIN_AUTH_SECRET` (32+ characters, signs cookies), `BRAIN_BASE_URL` (public origin, default `http://localhost:<port>`), `BRAIN_PORT`, `BRAIN_HOST`; and the doors: `GOOGLE_CLIENT_ID` with `GOOGLE_CLIENT_SECRET`, `<ID>_CLIENT_ID` with `<ID>_CLIENT_SECRET` per catalog entry, `BRAIN_SEAL_KEY` (64 hex; default derived from `BRAIN_AUTH_SECRET`). `app.ts` also mounts `@anvesx/brain-mcp` at `/mcp`.
