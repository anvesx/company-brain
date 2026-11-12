# connections (OAuth lifecycle): completion checklist

Done: **0.0% (0/42)**, 0 of 13 items. Evidence date 2026-11-13.

Scope: Connect, reconnect and disconnect sources (planned modules/connections; replaces apps/connections).

Package: `@anvesx/connections`. Lead WP: WP-20. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **CON-01** (w5, WP-20) OAuth state stored in Postgres, single use, expires in 10 min. Proof: `pnpm vitest run tests/contract/oauth-state.test.ts`
- [ ] **CON-02** (w4, WP-20) PKCE on every provider that supports it. Proof: `pnpm vitest run tests/contract/oauth-pkce.test.ts`
- [ ] **CON-03** (w4, WP-20) Callback error lands on a recoverable page with reason, retry and support id (PM F11). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/oauth-error.spec.ts`
- [ ] **CON-04** (w5, WP-20) Disconnect revokes at the provider and purges tokens, nodes and edges (PM F5). Proof: `pnpm vitest run tests/contract/disconnect-purge.test.ts`
- [ ] **CON-05** (w3, WP-20) Reconnect reuses the connection; no duplicate (DEBATE-codex rank 13). Proof: `pnpm vitest run tests/contract/reconnect.test.ts`
- [ ] **CON-06** (w2, WP-20) better-auth account linking per ADR 0009. Proof: `pnpm vitest run tests/contract/account-linking.test.ts`
- [ ] **CON-07** (w3, WP-20) Catalog fetch failure shows an error, not an empty list. Proof: `pnpm vitest run tests/contract/catalog-error.test.ts`
- [ ] **CON-08** (w3, WP-20) Only admins enable a connector; members see "ask your admin" (PM F8). Proof: `pnpm vitest run tests/contract/connector-admin.test.ts`
- [ ] **CON-09** (w5, WP-20) Live consent for GitHub, Drive and Slack on staging (owner items 3, 4, 5). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/consent-live.spec.ts`
- [ ] **CON-10** (w1, WP-20) arctic kept for provider OAuth (LIB-AUDIT). Proof: `pnpm why arctic`
- [ ] **CON-Q1** (w2, WP-20) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/connections`
- [ ] **CON-Q2** (w3, WP-20) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/connections exec stryker run`
- [ ] **CON-Q3** (w2, WP-20) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
