# tests/integration/names

`identity.names(userId)` against a real sign-up and a linked replay account.

| File            | Proves                                                                                         |
| --------------- | ---------------------------------------------------------------------------------------------- |
| `names.test.ts` | email, `emailVerified` false, the linked account id (not the password row); unknown user empty |
| `many.test.ts`  | 150 linked accounts: every id comes back, past the adapter's 100-row default                   |
