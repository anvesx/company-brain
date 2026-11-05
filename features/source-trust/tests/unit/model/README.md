# model tests

- `newest.test.ts` rules 4, 9, 16, 17: newest claim and newest correction per item, id and value tiebreaks, and copy edges sorted per copier, both input orders.
- `prepare.test.ts` rules 2, 4, 5, 10, 13, 17: the sorted Model, n, copy x decay factors, priors.
- `resolve.test.ts` rules 7, 8, 12, 15: defaults, option overrides, unknown class and prior keys.
- `weights.test.ts` rules 4 and 5: decay direction with a nonzero `at`, and the copy-cycle cut.
