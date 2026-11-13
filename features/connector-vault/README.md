# @anvesx/connector-vault

The one store for connector OAuth tokens (WP-14). It replaces the sealed columns in `features/identity` and `apps/connections`
and the plaintext token file.

- AES-256-GCM, row id as additional data, key ids for rotation (`rotate`, then drop the old key).
- Postgres row-level security per tenant; no read-all-tokens call exists.
- Refresh under a lease with retries; only a provider refusal sets needs-auth.
- `importRecords` moves existing credentials in with a dry run and a count check.

Tests need Postgres 16: `tests/support/pg-temp.sh`, then `DATABASE_URL=... pnpm --filter @anvesx/connector-vault test`.
See `todo/TODO.md` for what is left.
