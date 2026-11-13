# ui/model

What the pages show, worked out on the server from the real stores. No page code here.

- `format.ts`: `when` (a time as UTC plus how long ago), `count` (exact number with separators).
- `state.ts`: `stateOf` turns an account and its sync health into one of five states: not yet synced, syncing, healthy, error (with the reason) or needs reconnect.
- `rows.ts`: `connected` (the caller's accounts with state and exact counts) and `findRow` (one of them by id).
- `directory.ts`: `directory` groups the tenant's catalog into providers that can be connected now and those that cannot, with the reason.
