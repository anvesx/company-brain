# src

Glue between the real packages, used by the tests. No package exposes these steps today.

- `graph-docs.ts` reads the documents a connector owns out of the graph (`belongs-to` edges of its project node). `sourceDocs` turns them into the listing the rag repo's reindex takes: id, title, address, version, `updatedAt` and the sorted `can-read` readers.
- `zone-gate.ts` narrows a document's readers to the users zone-policy `canSee` allows for its zone. It works on any `{ path, principals }` document and carries a `tag` that changes with the zone.
