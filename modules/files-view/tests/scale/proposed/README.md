# proposed

Index and function changes the scale lane proposes to the builder, with the proof that they help.

- `001-faster-size-and-filters.sql`: faster `fv_num`, plus `fv_doc_mime` and `fv_doc_source`. The two indexes are now created by `src/db/migrate.ts` (keyed on the bigint modified instant); the SQL stays idempotent.
- `proposals.test.ts`: measures the two slow queries on the module's own migrate, applies the SQL, checks the rows are identical, then asserts the new p95 numbers. It keeps passing once the builder adopts the SQL.
