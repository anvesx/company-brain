# graph

How an account's documents are written into the shared graph.

- `zone.ts`: `coreZone`, the map from account zones (`private`, `personal`, `company`) to `@brain/core-types` zones (`personal`, `team`, `company`), and `keepsSourceAcl`.
- `stamp.ts`: `withZone` stamps every document with the mapped zone; `withOwner` adds the account owner to each document node.

## Rule for private

`private` and `personal` accounts are written to the graph owner-only, with zone `personal` (see `docs/specs/feature/zone-policy.md`: personal is visible to the owner alone, even to admins). The source's own ACL is not copied: each document gets one reader, the account owner, and no `member-of` edges are written. They are not left out of the graph, so the owner's brain queries find them, and nobody else's do. Only a `company` account keeps the source's readers. Widening later (a patch to `company`) takes effect on the next sync, and the rule that only an admin may do it is unchanged (`accounts/widen.ts`). There is no `team` zone from an account yet.
