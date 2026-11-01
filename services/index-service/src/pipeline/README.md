# Pipeline

- `prepare.ts`: fetch text, chunk it, embed it, and validate the vectors. Touches no stored state.
- `replace.ts`: `probe` (dimension check against the index), `replace` (remove then add), `restore` (rollback that keeps the narrowed ACL in registry and index; a failed add plus failed cleanup is `CLEANUP_FAILED` with an `AggregateError`).
- `lock.ts`: runs tasks for one key in call order; different keys run in parallel.
