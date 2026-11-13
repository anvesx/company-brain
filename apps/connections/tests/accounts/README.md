# accounts tests

The store on a real SQLite file (list visibility, update, delete, the active list the poll reads, reopen). `store.test.ts` covers it, `store-tenant.test.ts` proves a wrong tenant behaves like an unknown id on every method, `store-migrate.test.ts` the move off the old `secret` column; the widening rule is in `rules/`.

`fixture.ts` opens a store on a temp file for the other tests.
