# src

- `app.ts`: `createBrainApp({ store, identity, cursorKey, recheck?, port?, host? })`, a Hono app on `@hono/node-server`. It mounts identity's routes, the documents API and the graph view on one origin.
- `bin.ts`: reads env, opens the graph and auth databases, starts identity and the app, or runs `sync`.
- `index.ts`: public exports.
- `serve/`: `readServeConfig` (checks every env setting first, `ConfigError`) and `startBrain` (databases, identity, listen).
- `routes/`: `/v1/documents` behind `identity.protect` (pointers only) and the guard that shapes its 401.
- `gate/`: who may read which documents, from `can-read` and `member-of` edges
- `live/`: optional per-query permission recheck against the source
- `cli/`: the `connector`, `recheck` and `sync` commands

Env for `bin.ts`: `BRAIN_GRAPH_PATH`, `BRAIN_AUTH_DB` (SQLite file for sign-in data), `BRAIN_AUTH_SECRET` (32+ characters, signs cookies), `BRAIN_BASE_URL` (public origin, default `http://localhost:<port>`), `BRAIN_PORT`, `BRAIN_HOST`.
