# connectors

Linking other services (GitHub, Notion and so on) to a signed-in person, and keeping their tokens usable.

- `catalog.ts`: the provider list, the env var names for each secret, and the config check.
- `seal.ts`: AES-256-GCM sealing for token columns. The column name is bound in, so a value cannot be moved to another column.
- `schema.ts`: the extra `account` columns (status, refresh lease, label), the sealed token columns, and the account hooks.
- `refresh.ts`: `refreshAccount` (one account, for the refresh service: called directly it takes the row's lease first and answers `LEASED` if another process holds it, `NEEDS_AUTH` without asking the provider if the row needs the person; the sweep passes the row it already leased, so no second lease; a NULL lease end counts as free) and `accessToken` (on demand, with a 30 minute window and a 2 minute lease). A provider refusal marks `needs-auth` only if the row is unchanged since it was read (compare-and-set on `updatedAt`), so a refresh that worked in between is never overwritten. Errors are `RefreshError`: `NEEDS_AUTH`, `LEASED`, `PROVIDER_DOWN`, and `STORE_FAILED` when the database fails (kept apart from `PROVIDER_DOWN` because the provider may already have rotated the token).
