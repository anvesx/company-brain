# Source

`errors.ts` holds the three error types (none carries token bytes). `index.ts` is the public surface.

- `seal/`: AES-256-GCM seal with the row id as additional data; the keyring with key ids for rotation.
- `store/`: the Postgres table with row-level security, the tenant transaction, the vault API, key rotation.
- `refresh/`: the lease, the OAuth refresh exchange, retries, and the sweep of due rows.
- `migrate/`: dry-run import from the old stacks with a count check.
