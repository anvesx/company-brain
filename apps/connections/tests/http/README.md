# http tests

`fixture.ts` mints bearers and starts the server. `ann` and `bob` are ordinary users; `root` is a tenant admin.

- `repo.test.ts`: the `repo` field of a github account, patched, cleared, used by sync and migrated into an old database.
- `accounts/`: create, patch and delete over HTTP on a real SQLite file.
