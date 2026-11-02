# http tests

`accounts-create.test.ts` and `accounts-change.test.ts` boot the real app on a free port over a real SQLite file and calls it with `fetch`. `fixture.ts` mints bearers and starts the server. `ann` and `bob` are ordinary users; `root` is a tenant admin.
