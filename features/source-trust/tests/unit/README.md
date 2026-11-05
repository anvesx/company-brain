# Unit tests

One folder per area. Most cases go through the public API so the builder can shape internals;
only `score/weight.test.ts` and `loop/rounds.test.ts` import a module directly, because the worked example pins
`voteWeight(accuracy, n)`.

- `score/` rules 2, 3, 7, 8 and 15 (weight, vote, accuracy, rounds); `score/copy/` rule 4.
- `loop/` rules 8, 14 and 15 on `runRounds` directly (exact visit counts, epsilon boundary).
- `answer/` rules 6, 10 and 11 (groups, label).
- `input/` rule 12 (validate, errors), one `it.each` row per rejected case.
- `resolve/` rules 1, 4, 5 and 6 (conflict, copies, decay, ties).
- `rules/` rules 7, 9, 12, 13 and 15 (corrections, unicode, edge inputs).
