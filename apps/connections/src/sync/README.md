# sync

Runs one account's connector into the brain graph, and undoes it on disconnect.

- `route.ts`: `syncRoute(router, deps)` adds `POST /:id/sync` to the accounts router. Owner only. Body `{repo: "owner/repo"}` for a github account, or nothing when the account has a `repo` set; nothing for drive. `data/repo.ts` holds the owner/name rule shared with the account validation. A successful run sets `lastSyncAt`. An oauth account with a refresh token is refreshed first; a refused refresh makes the account `needs-auth` and the call answers 409. 501 when `deps.sync` is not set, 502 when the source fails.
- `run.ts`: `runAccountSync` builds the adapter with the account's own token and calls `graph-sync`.
- `data/`: `repo.ts` (the owner/name rule shared with the account validation) and `disconnect.ts` (closes the account's `can-read` and `member-of` edges, removes the account, rewrites the token file).
- `connector.ts`: `connectorFor` (the manifest's `load`, from the registry) and `sourceOf`. Every account writes under its own graph source, `<provider>:<account id>`, so two GitHub accounts do not share edges.

**Race with a zone change (#85).** A sync reads the account once, then awaits the network, so a PATCH that narrows `dataZone` can land mid-sync and the sync then writes edges at the old zone. Chosen fix: after the sync ends (success or failure) the route compares the account's current zone with the one the sync started with, and closes the account's edges if it narrowed or the account is gone (`data/stale.ts`). Smallest safe option: no locking, no change to `graph-sync`. Tradeoff: for the length of the sync the edges at the old zone exist in the graph (they were already there before the PATCH would have closed them, and the next sync rewrites them at the new zone). Rejected: re-reading the zone before each write (needs a hook inside `graph-sync`) and refusing PATCH while a sync runs (a design change to the API).

Zones and the owner are stamped by [`src/graph`](../graph/README.md). Graph times are milliseconds, as in `apps/brain`.
