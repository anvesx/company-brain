# design system (UI): completion checklist

Done: **0.0% (0/26)**, 0 of 9 items. Evidence date 2026-11-13.

Scope: Tokens and hono/jsx components shared by every screen (planned modules/design-system).

Package: `@anvesx/design-system`. Lead WP: WP-31. Builder / reviewer: Claude mid / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [ ] **DS-01** (w3, WP-31) Colour, type and spacing tokens with light and dark themes. Proof: `pnpm vitest run tests/contract/ds-tokens.test.ts`
- [ ] **DS-02** (w3, WP-31) Button, field, table, card, dialog, toast and empty-state components, each with an a11y test. Proof: `pnpm vitest run tests/contract/ds-components.test.ts`
- [ ] **DS-03** (w4, WP-31) Every token pair meets WCAG 2.2 AA contrast. Proof: `pnpm vitest run tests/contract/ds-contrast.test.ts`
- [ ] **DS-04** (w3, WP-31) Dialog traps focus and returns it on close. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/ds-dialog.spec.ts`
- [ ] **DS-05** (w3, WP-31) Async status announced through one live region. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/ds-live-region.spec.ts`
- [ ] **DS-06** (w3, WP-31) Each page ships at most 150 KB compressed. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/page-weight.spec.ts`
- [ ] **DS-Q1** (w2, WP-31) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/design-system`
- [ ] **DS-Q2** (w3, WP-31) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/design-system exec stryker run`
- [ ] **DS-Q3** (w2, WP-31) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
