# tests/tokens

Tokens live sealed in the Postgres vault; these tests use the real vault.

`vault.test.ts` covers `createWithToken` (the account row is rolled back when the vault refuses the token), `openVault` booting twice at once,
and `tokenFor` / `refreshAccount` for accounts with no vault row, a token that cannot be refreshed and a token that is not due.
The refresh itself against a provider is in `tests/sync/lifecycle/refresh.test.ts`.
