# src

- `access.ts`: who can read which documents, from `can-read` and `member-of` edges.
- `auth.ts`: bearer token check.
- `app.ts`: the HTTP server; routes return pointers only.
- `bin.ts`: reads env and starts it.
- `index.ts`: public exports.
- `live/` optional per-query permission recheck against the source
