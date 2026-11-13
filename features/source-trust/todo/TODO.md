# source-trust: completion checklist

Done: **15.4% (2/13)**, 1 of 6 items. Evidence date 2026-11-13.

Scope: Source trust scoring. Dead code today: use as a ranking input or delete.

Package: `@anvesx/source-trust`. Lead WP: WP-25. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

## Rules

1. One agent owns this module at a time. Its name goes in the owner line before work starts.
2. A different vendor reviews. Builder and reviewer are never the same model family.
3. Tick an item only with executed evidence: the proof command ran, passed, and its output is linked in the PR.
4. Builders may not edit `tests/contract/**` or `tests/large/acceptance/**` (T1, T2).
5. Percent = sum(weight of ticked items) / sum(weight of all items), always printed with the denominator.
6. Ticked items stay ticked and stay in this file; never delete, archive or reword them. Percent = ticked weight / total weight, so removing a ticked item corrupts the figure.
7. A proof is an executed command with a pass/fail exit code, or an explicit sign-off rubric (named signer, numeric pass threshold, evidence file). File existence, `rg -c` counts and subjective judgement alone are not proofs.

## Items

Format: id (weight, WP). Proof is the command that must pass.

- [ ] **STR-01** (w3, WP-25) Used by search ranking, or the package is deleted (PLAN section 3). Proof: `rg -q "@anvesx/source-trust" services apps`
- [ ] **STR-02** (w2, WP-25) Trust score enters ranking through one documented formula with a fixture test. Proof: `pnpm vitest run tests/contract/trust-rank.test.ts`
- [ ] **STR-03** (w1, WP-25) input/validate.ts, numbers.ts and prepare.ts replaced by zod (LIB-AUDIT section 1). Proof: `test ! -e features/source-trust/src/input/validate.ts && test ! -e features/source-trust/src/input/numbers.ts && test ! -e features/source-trust/src/input/prepare.ts`
- [x] **STR-Q1** (w2, WP-25) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/source-trust`
- [ ] **STR-Q2** (w3, WP-25) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/source-trust exec stryker run`
- [ ] **STR-Q3** (w2, WP-25) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
