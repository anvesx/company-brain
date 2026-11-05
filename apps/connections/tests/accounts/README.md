# accounts tests

The store on a real SQLite file (list visibility, update, delete, reopen, wrong key). `store.test.ts` and `store-keys.test.ts` cover it, and `store-tenant.test.ts` proves a wrong tenant behaves like an unknown id on every method; the widening rule and the encryption round trip are in `rules/`.

`fixture.ts` opens a store on a temp file for the other tests.
