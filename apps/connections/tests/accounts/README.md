# accounts tests

The store on a real SQLite file (list visibility, update, delete, reopen, wrong key). `store.test.ts` and `store-keys.test.ts` cover it; the widening rule and the encryption round trip are in `rules/`.

`fixture.ts` opens a store on a temp file for the other tests.
