# @anvesx/connector-vault

The one store for connector OAuth tokens (WP-14). It replaces the sealed columns in `features/identity` and `apps/connections`
and the plaintext token file.

- AES-256-GCM, row id as additional data, key ids for rotation (`rotate`, then drop the old key).
- Postgres row-level security per tenant; no read-all-tokens call exists.
- Refresh under a lease with retries; only a provider refusal sets needs-auth.
- `importRecords` moves existing credentials in with a dry run and a count check.

Tests need Postgres 16: `tests/support/pg-temp.sh`, then `DATABASE_URL=... pnpm --filter @anvesx/connector-vault test`.
See `todo/TODO.md` for what is left.

## Limits and trust assumptions
- Nonces are random 96-bit. That is safe to about 2^32 seals per key (NIST SP 800-38D), so `MAX_SEALS_PER_KEY = 2^32` and `seal` throws
  `KEY_EXHAUSTED` at the limit. The counter is per key id and per process (it resets on restart and is not summed across replicas):
  rotate keys well before the limit, and treat the limit as a per-replica backstop. `loadKeyring(raw, secret, maxSeals)` injects it for tests.
- `put` accepts ids of 1-128 characters from `A-Za-z0-9_:.-` (`BAD_ID` otherwise). The id is the AAD, so callers must pass a stable id they own.
- `migrate(pool, appRole)` refuses (`UNSAFE_ROLE`) a superuser or BYPASSRLS role and quotes the role as a SQL identifier.
- `createVault(pool, ring, { audit })`: `audit({ scope: "sweeper", at })` runs before every cross-tenant transaction (due scan, rotate,
  countIds). Only the sweeper and migration code should hold a vault with that power; a throwing `audit` blocks the call.
- A crashed refresh leaves the row leased until `leaseMs` (default 60s) passes; no watchdog (see `src/refresh/refresh.ts`).
- Auth-vs-transient sorting is RFC 6749: only `invalid_grant`, `invalid_client`, `unauthorized_client`, `invalid_token` set needs-auth.
  A provider with custom dead-grant codes is retried as transient until the set is made configurable.
