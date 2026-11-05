# score/copy

- `factors.ts` the chain copy factor of spec rule 4. It walks the copy edges depth first with an
  explicit stack, not recursion, so a chain of 20,000 sources resolves without a RangeError. A
  claim under visit holds 1, so a copy cycle stops where it closes.
