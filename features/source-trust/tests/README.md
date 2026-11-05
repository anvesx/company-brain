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

Stryker 98.61 (`reports/mutation.json`) left 7 Survived and 1 NoCoverage. Six survivors are
equivalent: no test can kill them, because no input tells the two programs apart. Line numbers
below are from the Stryker run; where a later edit moved one, the current line follows in
brackets.

- `input/newest.ts:26` `cmp(value, old.value) < 0` to `<= 0`: equal values mean an identical
  correction, so replacing it changes nothing.
- `input/newest.ts:5` `a < b` to `a <= b`: only changes the result for equal strings, and every
  comparison sorts unique ids or distinct values, or is the line 26 check above.
- `input/newest.ts:5` `a > b` to `a >= b`: same, equal strings give 1 instead of 0, and no
  caller tells them apart.
- `answer/groups.ts:12` `cmp(top.value, next.value) <= 0` to `< 0`: the two groups hold distinct
  values, so cmp is never 0.
- `answer/groups.ts:27` `item.corrected >= 0` to true: with no correction `groups[-1]` is
  undefined, the same as the `undefined` the condition returns.
- `answer/label.ts:34` [now 52] `p.item === undefined` to false: `winners.get(undefined)` finds nothing,
  because every key is a string, so the group is unresolved either way.

The other two are not equivalent and are not in the list above:

- NoCoverage, `input/newest.ts:38` [now 40] the edge-sort comparator `a.original - b.original` to `+`: no
  test sorted two edges of one copier. Now covered by `unit/model/newest.test.ts` (two edges in
  both input orders); with the comparator changed to `+` that test fails. Stryker was not re-run.
- Survived, StringLiteral at `input/validate.ts:17` [now 19], the `` `sources[${i}]` `` label
  passed to `asRecord`, emptied. Emptying it by hand now fails 3 tests, so existing tests cover
  it. This was checked by hand, not by Stryker, so the mutant is open until Stryker runs again.
