# Core

Public connector types, typed errors, registry ownership, and SHA-256 hashing. Paging lives in
`paging/`. The paging helper accepts only canonical cursor offsets and limits from 1 through 1000.

`Connector.listMemberships?()` is optional and returns every `{ group, user }` pair behind the group ids in ACLs. It must be complete, because graph-sync closes edges it no longer sees.

`Connector.canRead?()` is an optional, metadata-only live check: can this token's owner still read this address. False means the source hides it; a thrown error means unknown.
