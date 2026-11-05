# Integration tests

`public-api.test.ts` imports only `src/index.ts`: one happy path (resolve then label) and one
error path (`TrustError`, `BAD_INPUT`, field name).
