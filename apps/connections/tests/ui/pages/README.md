# pages tests

- `launch-redirect.test.ts`: the launcher's `uiRedirect` option sends a failed callback back to the page.
- `last-sync.test.ts`: `lastSyncAt` is null, then set by a successful sync only.
- `account.test.ts`: Sync is disabled and explained without a repository (and that is not a failure), Clear repository, Reconnect, and signing in again renews the same account.
