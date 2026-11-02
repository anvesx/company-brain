# src

Glue between the real packages, used by the tests. No package exposes these steps today.

- `reindex.ts` reads the documents a connector owns out of the graph (`belongs-to` edges of its project node), fetches their text from the connector, and brings a rank index in line: `diffListing` from change-cursor decides what to index and what to remove. It diffs `version|gate tag|hash of the can-read reader set`, so an ACL change that leaves the source version alone (Drive) still reindexes.
- `zone-gate.ts` narrows a document's readers to the users zone-policy `canSee` allows for its zone.
