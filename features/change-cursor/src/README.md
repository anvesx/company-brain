# change-cursor/src

Incremental sync state. The store issues and validates opaque cursors, and `diffListing` reports what changed between two listings.

| Entry      | Job                                                         |
| ---------- | ----------------------------------------------------------- |
| `index.ts` | Public exports of the package                               |
| `diff.ts`  | `diffListing`: compares a new listing to the previous one   |
| `store.ts` | `createCursorStore`: persists cursor state in `node:sqlite` |
| `model/`   | Schema, limits, input validators and the `CursorError` type |
