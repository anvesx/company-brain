# safety

Tests for the sync guarantees that keep one source from reaching another's data or undoing a revocation.

- `isolation.test.ts` per-connector node ids, no ACL union across connectors, shared principals written once, user and group id clash
- `lease.test.ts` an overlapping or stale run cannot overwrite a newer ACL or tombstone
- `clash.test.ts` user/group/document id clashes inside one run, two addresses on one node
- `poison.test.ts` one bad entry is skipped and reported, fails closed, and never blocks tombstoning
