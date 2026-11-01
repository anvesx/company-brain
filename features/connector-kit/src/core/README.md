# Core

Public connector types, typed errors, registry ownership, paging validation, per-walk snapshots, and SHA-256 hashing.
The paging helper accepts only canonical cursor offsets and limits from 1 through 1000.
`walks.ts` keys each folder walk by an opaque cursor `<walkId>:<offset>`, keeps at most 16 open walks
(oldest evicted) and drops a walk after its last page.
