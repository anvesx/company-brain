# upkeep (memory hygiene): completion checklist

Done: **0.0% (0/23)**, 0 of 9 items. Evidence date 2026-11-13.

Scope: Expiry, lint and drift checks that keep the brain correct over time (planned services/upkeep).

Package: `@anvesx/upkeep`. Lead WP: WP-33. Builder / reviewer: Kiro qwen3-coder-next / Claude verifier. Owner agent: unassigned.

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

- [ ] **UPK-01** (w3, WP-33) Stale facts expire (closed), never deleted (Slite, validity). Proof: `pnpm vitest run tests/contract/upkeep-expiry.test.ts`
- [ ] **UPK-02** (w3, WP-33) Linter flags broken links and orphans (Meta, lint). Proof: `pnpm vitest run tests/contract/upkeep-lint.test.ts`
- [ ] **UPK-03** (w3, WP-33) Drift check flags graph rows that disagree with the source. Proof: `pnpm vitest run tests/contract/upkeep-drift.test.ts`
- [ ] **UPK-04** (w3, WP-33) Contradicting facts kept side by side with a policy, not overwritten (Vectorize, conflicts). Proof: `pnpm vitest run tests/contract/upkeep-contradiction.test.ts`
- [ ] **UPK-05** (w2, WP-33) Dormant items demoted by attestation decay (Sola 2610.12540). Proof: `pnpm vitest run tests/contract/upkeep-dormant.test.ts`
- [ ] **UPK-06** (w2, WP-33) Upkeep cycle runs on the queue and reports counts (GBrain, upkeep). Proof: `pnpm vitest run tests/contract/upkeep-cycle.test.ts`
- [ ] **UPK-Q1** (w2, WP-33) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/upkeep`
- [ ] **UPK-Q2** (w3, WP-33) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/upkeep exec stryker run`
- [ ] **UPK-Q3** (w2, WP-33) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
