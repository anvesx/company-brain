# entity resolver: completion checklist

Done: **0.0% (0/21)**, 0 of 7 items. Evidence date 2026-11-13.

Scope: Merges the same person or document across sources (planned features/entity-resolver).

Package: `@anvesx/entity-resolver`. Lead WP: WP-24. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **ER-01** (w4, WP-24) Same verified email across GitHub, Drive and Slack becomes one person node (GBrain, entities). Proof: `pnpm vitest run tests/contract/entity-merge.test.ts`
- [ ] **ER-02** (w5, WP-24) Display-name match alone never merges two people. Proof: `pnpm vitest run tests/contract/entity-no-false-merge.test.ts`
- [ ] **ER-03** (w3, WP-24) Every merge reversible and written to the audit log. Proof: `pnpm vitest run tests/contract/entity-unmerge.test.ts`
- [ ] **ER-04** (w2, WP-24) Each rule in the spec has a fixture test. Proof: `pnpm vitest run tests/contract/entity-rules.test.ts`
- [ ] **ER-Q1** (w2, WP-24) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/entity-resolver`
- [ ] **ER-Q2** (w3, WP-24) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/entity-resolver exec stryker run`
- [ ] **ER-Q3** (w2, WP-24) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
