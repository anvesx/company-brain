# score/copy tests

- `chain.test.ts` rule 4: a 50-chain and a 20,000-chain score by the documented formula
  log2(3) * (2 - 2^(1-n)), and a two-source cycle stops where it closes. The 20,000-chain threw a
  RangeError when the walk was recursive.
- `skip.test.ts` rule 4: an edge to a source with a different value is skipped, and the next edge
  of the same copier still counts.
