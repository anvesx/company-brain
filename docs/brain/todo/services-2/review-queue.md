# review queue: completion checklist

Done: **0.0% (0/24)**, 0 of 8 items. Evidence date 2026-11-13.

Scope: Human approval for proposed facts and write-backs (planned services/review-queue).

Package: `@anvesx/review-queue`. Lead WP: WP-33. Builder / reviewer: Kiro glm-5 / Codex. Owner agent: unassigned.

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

- [ ] **RVQ-01** (w5, WP-33) Proposed fact invisible to every surface until approved. Proof: `pnpm vitest run tests/contract/review-invisible.test.ts`
- [ ] **RVQ-02** (w3, WP-33) Each rejection becomes a regression replay case (Meta, evals). Proof: `pnpm vitest run tests/contract/review-replay.test.ts`
- [ ] **RVQ-03** (w3, WP-33) Write-back to source only as a proposal (Vectorize, write-back). Proof: `pnpm vitest run tests/contract/review-writeback.test.ts`
- [ ] **RVQ-04** (w3, WP-33) Approval and rejection audited with actor and diff (Corezoid, audit). Proof: `pnpm vitest run tests/contract/review-audit.test.ts`
- [ ] **RVQ-05** (w3, WP-33) Only owners and admins approve; others get 403. Proof: `pnpm vitest run tests/contract/review-authz.test.ts`
- [ ] **RVQ-Q1** (w2, WP-33) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/review-queue`
- [ ] **RVQ-Q2** (w3, WP-33) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/review-queue exec stryker run`
- [ ] **RVQ-Q3** (w2, WP-33) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
