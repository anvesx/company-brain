# token-refresh: completion checklist

Done: **8.0% (2/25)**, 1 of 8 items. Evidence date 2026-11-13.

Scope: Keeps provider access tokens fresh (lifecycle step 12).

Package: `@anvesx/token-refresh`. Lead WP: WP-14. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **TR-01** (w5, WP-14) Only invalid_grant forces re-consent; network and 5xx errors retry (PLAN section 8, step 12). Proof: `pnpm vitest run tests/contract/refresh-errors.test.ts`
- [ ] **TR-02** (w4, WP-14) Two instances never refresh the same token at once. Proof: `pnpm vitest run tests/contract/refresh-lease.test.ts`
- [ ] **TR-03** (w3, WP-14) Refresh runs as a queue cron before the expiry window, not a while loop. Proof: `pnpm vitest run tests/contract/refresh-cron.test.ts`
- [ ] **TR-04** (w2, WP-14) withRetry and inParallel replaced by p-retry and p-limit (LIB-AUDIT section 6). Proof: `rg -q "p-retry" services/token-refresh/src && rg -q "p-limit" services/token-refresh/src`
- [ ] **TR-05** (w4, WP-14) Google refresh token still valid after 7 days on the owner's Production consent screen (owner items 1, 2). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/refresh-live.spec.ts`
- [x] **TR-Q1** (w2, WP-14) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/token-refresh`
- [ ] **TR-Q2** (w3, WP-14) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/token-refresh exec stryker run`
- [ ] **TR-Q3** (w2, WP-14) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
