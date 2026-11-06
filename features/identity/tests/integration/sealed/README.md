# tests/integration/sealed

Token columns on the `account` table for the Google sign-in door.

| File             | Proves                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `google.test.ts` | `createIdentity` refuses `google` without a `sealKey`; with one, the stored tokens hold no plaintext |
