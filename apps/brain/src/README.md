# src

- `app.ts`: the HTTP server; routes return pointers only.
- `bin.ts`: reads env and starts it.
- `index.ts`: public exports.
- `gate/`: who may call and who may read (bearer token check, access from `can-read` and `member-of` edges)
- `live/` optional per-query permission recheck against the source
- `cli/`: the `connector`, `recheck` and `sync` commands
