# gate

The two checks every request passes before a pointer is returned.

- `auth.ts`: bearer token check. `verify` returns a `Caller` or refuses; secrets shorter than `MIN_SECRET_CHARS` are rejected.
- `access.ts`: who can read which documents, from `can-read` and `member-of` edges in the graph (`canRead`, `readableDocuments`).

`app.ts` and `live/` import from here; this folder imports only from the graph store.
