# src

- `app.ts`: the HTTP server; routes return pointers only.
- `bin.ts`: reads env and starts it. `brain serve` is the Postgres entry; the default is local SQLite through `toAsync`.
- `serve/`: the production server (Postgres pool, identity mount, `/healthz`)
- `index.ts`: public exports.
- `gate/`: who may call and who may read (bearer token check, access from `can-read` and `member-of` edges)
- `live/` optional per-query permission recheck against the source
- `cli/`: the `connector`, `recheck` and `sync` commands
