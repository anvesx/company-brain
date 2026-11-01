# Pipeline

- `prepare.ts`: fetch text, chunk it, embed it, and validate the vectors. Touches no stored state.
- `replace.ts`: `probe` (dimension check against the index), `replace` (remove then add), `restore` (registry rollback).
- `lock.ts`: runs tasks for one key in call order; different keys run in parallel.
