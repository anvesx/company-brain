# sync

Runs one account's connector into the brain graph, and undoes it on disconnect.

- `route.ts`: `syncRoute(router, deps)` adds `POST /:id/sync` to the accounts router. Owner only. Body `{repo: "owner/repo"}` for a github account, or nothing when the account has a `repo` set; nothing for drive. `data/repo.ts` holds the owner/name rule shared with the account validation. A successful run sets `lastSyncAt`. An oauth account with a refresh token is refreshed first; a refused refresh makes the account `needs-auth` and the call answers 409. 501 when `deps.sync` is not set, 502 when the source fails.
- `run.ts`: `runAccountSync` builds the adapter with the account's own token and calls `graph-sync`.
- `data/`: `repo.ts` (the owner/name rule shared with the account validation) and `disconnect.ts` (closes the account's `can-read` and `member-of` edges, removes the account, rewrites the token file).
- `connector.ts`: `connectorFor` (the manifest's `load`, from the registry) and `sourceOf`. Every account writes under its own graph source, `<provider>:<account id>`, so two GitHub accounts do not share edges.

Zones and the owner are stamped by [`src/graph`](../graph/README.md). Graph times are milliseconds, as in `apps/brain`.
