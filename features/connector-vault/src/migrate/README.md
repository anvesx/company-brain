# migrate

`migrate.ts` imports already-decrypted credentials from the old stacks. `dryRun` writes nothing; a real run re-counts and throws
COUNT_MISMATCH when a row is missing. Repeating it is safe.
