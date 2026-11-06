# tests/integration/refresh

`port.accessToken` and `refreshAccount` against the real replay provider and a real SQLite file.
Spec: [connector-accounts](../../../../../docs/specs/feature/connector-accounts.md) rule 4.

| File              | Proves                                                                                                                                                                                                                              |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `race.test.ts`    | two concurrent calls on a due row: both succeed, one provider call, status active; a held lease gives LEASED; a refusal after a rotation does not mark needs-auth; a NULL lease end is free; the needs-auth mark is compare-and-set |
| `process.test.ts` | two separate node processes call `refreshAccount` on one unleased due row: one provider call, the other gets LEASED, the row ends active                                                                                            |
| `store.test.ts`   | a closed database or a failing write is `STORE_FAILED`, never `PROVIDER_DOWN`; the provider was still asked once                                                                                                                    |
| `once.test.ts`    | two `refreshAccount` calls at once make one provider call; a needs-auth row answers NEEDS_AUTH with no provider call, also for a direct `refreshAccount`                                                                            |
