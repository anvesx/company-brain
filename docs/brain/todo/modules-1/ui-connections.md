# UI: Sources screen: completion checklist

Done: **0.0% (0/24)**, 0 of 9 items. Evidence date 2026-11-13.

Scope: Screens for connecting and managing sources.

Package: `@anvesx/ui-connections`. Lead WP: WP-31. Builder / reviewer: Claude mid / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [ ] **UIC-01** (w5, WP-31) Connect goes straight to Syncing with a live item count (PM F1, F3). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/connect-syncing.spec.ts`
- [ ] **UIC-02** (w3, WP-31) Card shows scopes, last and next sync, count, errors and Reconnect. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/source-card.spec.ts`
- [ ] **UIC-03** (w3, WP-31) Disconnect asks for confirmation and states what is deleted (PM F5). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/disconnect-confirm.spec.ts`
- [ ] **UIC-04** (w2, WP-31) Detail page lists sync history. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/source-history.spec.ts`
- [ ] **UIC-05** (w2, WP-31) Not connected, syncing, ready, stale and failed states each rendered. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/source-states.spec.ts`
- [ ] **UIC-06** (w2, WP-31) Zero serious axe findings. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/sources-a11y.spec.ts`
- [ ] **UIC-Q1** (w2, WP-31) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/ui-connections`
- [ ] **UIC-Q2** (w3, WP-31) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/ui-connections exec stryker run`
- [ ] **UIC-Q3** (w2, WP-31) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
