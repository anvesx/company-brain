# unit

- `acl.test.ts` ACL to person/team nodes and `can-read` edges, resolve hook, no text props, unicode, huge ACLs
- `resync.test.ts` idempotent re-sync, ACL narrowing and widening
- `input.test.ts` page size bounds, empty tenant, duplicate addresses, stuck cursor
- `lifecycle/` tombstones and connector failures
- `safety/` per-connector node ids, overlapping runs, id clashes, bad entries skipped fail closed
- `membership/` group membership to `member-of` edges
