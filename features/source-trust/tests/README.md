# Tests

This suite is the contract for spec `docs/specs/feature/source-trust.md`. Builders make it green;
they do not edit it. Test names start with the spec rule they pin, for example `rule 6: ...`.
Every expected number is hand-computed in a comment next to the assertion.

- `unit/` one hand-computed case per rule, grouped by the src file that owns it.
- `property/` fast-check invariants, 200 runs each.
- `research/` the seeded replication study against Dong 2009 Table 3.
- `integration/` the public API through `src/index.ts` only.
- `scale/` rule 14 timing with printed counts. The mutation run (`vitest.stryker.config.ts` at the
  repo root) leaves this folder out: instrumented code runs about 20% slower, which fails the 2 s CPU
  bound for reasons unrelated to the code.

## Equivalent mutants

Stryker 98.21 (`reports/mutation.json`, 670 mutants) left 10 Survived and 2 NoCoverage. No input
tells any of the 12 apart from the original program, so no test can kill them. Lines are current.

- `input/newest.ts:5` `a < b` to `a <= b`, `a > b` to `a >= b`, and `a > b` to true: each changes
  `cmp` only for two equal strings. Callers sort unique ids, keys or values, or are the next item.
- `input/newest.ts:26` `cmp(value, old.value) < 0` to `<= 0`: equal values at one time replace the
  entry with an identical `{ item, value, at }`.
- `answer/groups.ts:12` `cmp(top.value, next.value) <= 0` to `< 0`: the two groups hold distinct
  values, so cmp is never 0.
- `answer/groups.ts:27` `item.corrected >= 0` to true: with no correction `groups[-1]` is
  undefined, the same as the `undefined` the condition returns.
- `answer/label.ts:52` `p.item === undefined` to false: `winners.get(undefined)` finds nothing,
  because `checkResult` makes every key a string, so the group is unresolved either way.
- `input/numbers.ts:28` `typeof value !== "number"` to false: `Number.isInteger` is false for any
  non-number, so the next operand rejects it with the same error. (Line 33 is different: `"0.5"`
  passes `p >= 0.01` by coercion; the "prior a numeric string" row kills it.)
- `input/prepare.ts:47` `input.copies ?? []` to `["Stryker was here"]`: the string gives one edge
  with copier and original undefined, stored under the Map key undefined. Every lookup uses a
  number, so nothing reads it.
- `score/copy/factors.ts:23` `edges.get(...) ?? []` to `["Stryker was here"]`: the walk reads
  `edge.original` as undefined, `at.get(undefined)` finds nothing, the edge is skipped, and the
  factor stays 1, the same as with no edges.
- `score/vote.ts:15` and `score/accuracy.ts:10` NoCoverage, default `tally = { visits: 0 }` to
  `{}`: `runRounds` always passes a tally, so the default never runs. A direct call would reach
  it, but the `{}` tally only turns its private counter into NaN, which nothing returns.

Killed since the 95.22 run: the `visits` counters and `votes: []` by `unit/loop/rounds.test.ts`;
`change < epsilon` by the same file; `>= epsilon` in groups.ts:9 by `unit/answer/groups.test.ts`;
`top.next += 1` by `unit/score/copy/skip.test.ts`; numbers.ts:33 and :38 and validate.ts:23, :74,
:75, :76 by new rows in `unit/input/`.
