# e2e tests

`github-pat.test.ts` runs the whole path with no stub of the thing under test. The real app serves HTTP over a SQLite account file, a GitHub personal-access-token account is created as a tenant admin with `dataZone: company`, and sync runs the real GitHub connector against a local HTTP server that replays recorded GitHub JSON. A second handle on the graph file then plays the brain app: both documents carry the zone, and after DELETE the account's `can-read` and `member-of` edges are closed.

`launcher.test.ts` starts the app the way `bin.ts` does, from environment settings, and checks the token file and the GitHub API URL setting end to end.
