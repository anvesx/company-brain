# UI: Search and Ask: completion checklist

Done: **0.0% (0/21)**, 0 of 7 items. Evidence date 2026-11-13.

Scope: Search results and the Ask panel.

Package: `@anvesx/ui-search`. Lead WP: WP-35. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

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

- [ ] **UIQ-01** (w5, WP-35) Results show citation and "why this result". Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/search-results.spec.ts`
- [ ] **UIQ-02** (w3, WP-35) No-results and partial-source states rendered. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/search-states.spec.ts`
- [ ] **UIQ-03** (w4, WP-35) Ask panel returns a cited answer; degrades to search when RAG is down. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/ask-panel.spec.ts`
- [ ] **UIQ-04** (w2, WP-35) Results announced through the live region; axe clean. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/search-a11y.spec.ts`
- [ ] **UIQ-Q1** (w2, WP-35) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/ui-search`
- [ ] **UIQ-Q2** (w3, WP-35) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/ui-search exec stryker run`
- [ ] **UIQ-Q3** (w2, WP-35) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
