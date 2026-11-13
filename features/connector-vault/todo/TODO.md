# connector-vault todo

Done in this package: seal, keyring, RLS table, rotate, refresh with lease and retries, sweep, import with dry run.

Not done (other packages own the wiring):
- [ ] Switch `apps/connections` OAuth routes and `services/token-refresh` to this package, then delete their copies of the cipher.
- [x] `apps/connections/src/tokens/write-token-file.ts` is deleted; the sync runner reads tokens from the vault per job.
- [ ] Delete the `BRAIN_USER_TOKENS_FILE` readers in `apps/brain` (WP-33).
- [ ] Remove the seal in `features/identity/src/connectors/seal.ts` after a data migration with `importRecords`.
- [ ] Stryker run and score.
