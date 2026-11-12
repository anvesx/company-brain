# e2e harness: completion checklist

Done: **9.1% (2/22)**, 1 of 8 items. Evidence date 2026-11-13.

Scope: Browser tests against the real app, real Postgres and a real OIDC server.

Package: `@anvesx/e2e`. Lead WP: WP-41. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **E2E-01** (w5, WP-41) Harness boots Postgres 16, Keycloak and the built app in containers; no stand-in anywhere. Proof: `pnpm --filter @anvesx/e2e exec playwright test`
- [ ] **E2E-02** (w3, WP-41) axe runs inside every page spec and fails on a serious finding. Proof: `test -z "$(rg --files-without-match AxeBuilder tools/e2e/tests/ui --glob "*.test.ts")" && pnpm --filter @anvesx/e2e e2e`
- [ ] **E2E-03** (w3, WP-41) Seed fixture: two tenants and three users with different access, shared with the leak suite. Proof: `pnpm vitest run tests/contract/leak-suite.test.ts`
- [ ] **E2E-04** (w3, WP-41) Runs in CI on every push in under 15 min. Proof: `test "$(gh run list --workflow e2e --limit 1 --json conclusion --jq ".[0].conclusion")" = success`
- [ ] **E2E-05** (w1, WP-41) Traces and screenshots kept as CI artifacts on failure. Proof: `rg -n "trace: .retain-on-failure" tools/e2e/playwright.config.ts`
- [x] **E2E-Q1** (w2, WP-41) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/e2e`
- [ ] **E2E-Q2** (w3, WP-41) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/e2e exec stryker run`
- [ ] **E2E-Q3** (w2, WP-41) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
