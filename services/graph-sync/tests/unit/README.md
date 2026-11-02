# unit

- `acl.test.ts` ACL to person/team nodes and `can-read` edges, resolve hook, no text props, unicode, huge ACLs
- `resync.test.ts` idempotent re-sync, ACL narrowing and widening
- `tombstone.test.ts` documents missing from the listing, revival, empty listing, other connectors
- `failure.test.ts` connector failure mid-page, abort, no tombstone after failure
- `input.test.ts` page size bounds, empty tenant, duplicate addresses, stuck cursor
