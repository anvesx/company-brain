# UI shell and sign-in: completion checklist

Done: **0.0% (0/27)**, 0 of 10 items. Evidence date 2026-11-13.

Scope: Sign-in page, navigation, Home and Settings.

Package: `@anvesx/ui-shell`. Lead WP: WP-31. Builder / reviewer: Claude mid / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [ ] **UIS-01** (w5, WP-31) Sign-in page offers only Google. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/signin-page.spec.ts`
- [ ] **UIS-02** (w3, WP-31) One nav shell: Home, Ask, Files, Graph, Sources, Settings. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/nav-shell.spec.ts`
- [ ] **UIS-03** (w3, WP-31) Home shows a first-run checklist that ticks itself. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/first-run.spec.ts`
- [ ] **UIS-04** (w3, WP-31) Settings shows source health and freshness. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/settings-health.spec.ts`
- [ ] **UIS-05** (w3, WP-31) Every page passes axe and a keyboard-only walk. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/shell-a11y.spec.ts`
- [ ] **UIS-06** (w2, WP-31) Usable at 375 px width with no horizontal scroll. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/mobile.spec.ts`
- [ ] **UIS-07** (w1, WP-31) Footer states that the brain stores pointers, not documents. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/pointers-statement.spec.ts`
- [ ] **UIS-Q1** (w2, WP-31) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/ui-shell`
- [ ] **UIS-Q2** (w3, WP-31) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/ui-shell exec stryker run`
- [ ] **UIS-Q3** (w2, WP-31) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
