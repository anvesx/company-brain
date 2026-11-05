# loop tests

- `rounds.test.ts` rules 8, 14 and 15 on `runRounds` directly: the exact per-round visit count
  (2 I + 2 N + 5 V + 3 S), the empty model's votes, and the `change < epsilon` boundary.
  Kept apart from `score/` because the scale test, which also asserts visits, is left out of the
  mutation run, so these unit cases are what pins the visit counters there.
