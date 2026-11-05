# score

The maths of spec rules 2 to 9. Pure functions, no I/O, no clock, no randomness.

- `weight.ts` holds the class priors (rule 1), `voteWeight(accuracy, n)` = log2(n A / (1 - A)) with
  A clamped to [0.01, 0.99] (rule 2), the decay factor (rule 5) and re-exports the chain copy factor (rule 4) from `copy/`.
- `vote.ts` sums weights per value, then turns scores into confidences with 2^C and max
  subtraction (rule 3). A corrected item pins P to 1 and 0 (rule 9).
- `accuracy.ts` sets A(S) to the mean P(v) of S's claims, keeps the prior below minClaims, and
  clamps to [0.01, 0.99] (rule 7).
- `rounds.ts` loops vote then accuracy from the priors until the largest change is below epsilon
  or maxRounds is hit, and reports rounds and converged (rule 8).
