# input tests

- `cases.ts` a valid call, a field setter, and the BAD_INPUT assertion shared by both tables.
- `validate.test.ts` rule 12 rows for strings, ids, references and copy edges.
- `numbers.test.ts` rule 12 rows for at, now, priors, minClaims, maxRounds, epsilon, halfLifeMs.
- `errors.test.ts` the `TrustError` shape and the `badInput` helper.
