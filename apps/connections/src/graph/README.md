# graph

How an account's documents are written into the shared graph.

- `zone.ts`: `coreZone`, the map from account zones (`private`, `personal`, `company`) to `@anvesx/core-types` zones (`personal`, `team`, `company`), and `keepsSourceAcl`.
- `stamp.ts`: `withZone` stamps every document with the mapped zone.
- `namespace.ts`: `docId`, `withNamespace` and `resolveFor` give documents and groups an id per account.
- `store.ts`: `forAccount` wraps the graph store for one account: adds the owner to each document and hides the pieces that differ between accounts, so a re-run writes nothing.

## Ids per account

A document's graph id is `<provider>:<accountId>/<address>`, for example `github:ab12/README.md`; its `address` prop stays the source's own (`README.md`). A team is `<source>/<raw>` as well, so `acme/docs` in two accounts is two groups. People (`octocat`) keep their own id and are shared. Two accounts that list the same path therefore never share a node or an edge: disconnecting one closes only its edges (graph-store needed no change). Documents written before this change keep their old plain ids; the next sync of the account tombstones them.

## Rule for private

`private` and `personal` accounts are written to the graph owner-only, with zone `personal` (see `docs/specs/feature/zone-policy.md`: personal is visible to the owner alone, even to admins). The source's own ACL is not copied: each document gets one reader, the account owner, and no `member-of` edges are written. They are not left out of the graph, so the owner's brain queries find them, and nobody else's do. Only a `company` account keeps the source's readers. Widening later (a patch to `company`) takes effect on the next sync, and the rule that only an admin may do it is unchanged (`accounts/widen.ts`). There is no `team` zone from an account yet.
