# lifecycle

How a sync run ends and what it leaves behind.

- `tombstone.test.ts` documents missing from the listing, revival, empty listing, other connectors
- `failure.test.ts` connector failure mid-page, abort, no tombstone after failure
- `skip.test.ts` the guard around bad entries and the fail-closed revoke of a skipped document
