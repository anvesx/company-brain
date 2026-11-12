# structure-lint: completion checklist

Done: **57.9% (11/19)**, 5 of 9 items. Evidence date 2026-11-13.

Scope: Enforces module shape, size limits and tiers.

Package: `@anvesx/structure-lint`. Lead WP: WP-00. Builder / reviewer: Kiro qwen3-coder-next / Codex. Owner agent: unassigned.

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

- [x] **SL-01** (w3, WP-00) Module shape: package.json, README, src and tests present in every package. Proof: `pnpm structure`
- [x] **SL-02** (w2, WP-00) Package root holds at most five files (ADR 0007). Proof: `pnpm structure`
- [x] **SL-03** (w2, WP-00) Folders hold at most five files and each has a README; files at most 80 lines. Proof: `pnpm structure`
- [x] **SL-04** (w2, WP-00) Tier import rule: a package imports only from tiers below (ADR 0001). Proof: `pnpm deps`
- [ ] **SL-05** (w2, WP-00) exports map validated: every entry resolves to a built file. Proof: `pnpm structure`
- [ ] **SL-06** (w1, WP-00) fs/walk.ts replaced by node:fs globSync (LIB-AUDIT section 8). Proof: `rg -q globSync tools/structure-lint/src`
- [x] **SL-Q1** (w2, WP-00) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/structure-lint`
- [ ] **SL-Q2** (w3, WP-00) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/structure-lint exec stryker run`
- [ ] **SL-Q3** (w2, WP-00) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
