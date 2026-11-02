# reindex

- `reindex.test.ts` checks that `reindex` marks a document indexed only after the rank index committed it, and that a document without `updatedAt` is still indexed.
