# Property tests

fast-check, 200 runs each. `arb.ts` builds small random inputs and a deep-freeze helper.

- `invariance.test.ts` permutation invariance, item coverage, accuracy bounds, label length,
  no mutation.
- `monotone.test.ts` a copy edge never raises the copied value, removing a winner's claim never
  raises it. Scoped to one round and positive weights; see the comment in the file.
- `convergence.test.ts` converged means one more round moves nothing beyond epsilon.
