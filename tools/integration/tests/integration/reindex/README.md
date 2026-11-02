# reindex

- `reindex.test.ts` checks that `reindex` marks a document indexed only after the rank index committed it, and that a document without `updatedAt` is still indexed.
- `big.test.ts` a corpus above the rank batch cap is indexed in slices
- `acl-only.test.ts` a connector whose version ignores the ACL: a revoked reader leaves the index on the next reindex
