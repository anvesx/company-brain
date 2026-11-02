# unit

- `acl.test.ts` ACL to person/team nodes and `can-read` edges, resolve hook, no text props, unicode, huge ACLs
- `resync.test.ts` idempotent re-sync, ACL narrowing and widening
- `input.test.ts` page size bounds, empty tenant, duplicate addresses, stuck cursor
- `lifecycle/` tombstones, connector failures, bad entries skipped
- `safety/` per-connector node ids, overlapping runs, id clashes, bad entries skipped fail closed
- `membership/` group membership to `member-of` edges
- `write/` node, root and access writes called directly
- `run/` run failure messages and error kinds
