# apps/brain (the deployable): completion checklist

Done: **6.2% (2/32)**, 1 of 11 items. Evidence date 2026-11-13.

Scope: The only deployable: one Hono app mounting every module.

Package: `@anvesx/brain-app`. Lead WP: WP-40. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

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

- [ ] **APP-01** (w3, WP-40) One Hono app started by serve(); serve/mount.ts mux and createServer deleted (LIB-AUDIT section 5). Proof: `test "$(rg -c createServer apps/brain/src | wc -l)" -eq 0`
- [ ] **APP-02** (w4, WP-40) Every module mounted; route smoke test gets an expected status from every route. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/routes-smoke.spec.ts`
- [ ] **APP-03** (w3, WP-40) Readiness returns 503 until migrations are applied and the queue is reachable. Proof: `pnpm vitest run tests/contract/readiness.test.ts`
- [ ] **APP-04** (w3, WP-40) SIGTERM drains in-flight requests; 620 s keep-alive kept. Proof: `pnpm vitest run tests/contract/shutdown.test.ts`
- [ ] **APP-05** (w3, WP-15) All settings validated by one zod schema at boot; a bad value exits 1. Proof: `pnpm vitest run tests/contract/app-config.test.ts`
- [ ] **APP-06** (w3, WP-15) Every 5xx logged with a request id; no swallowed catch. Proof: `pnpm vitest run tests/contract/error-handler.test.ts`
- [ ] **APP-07** (w1, WP-40) 404 page uses the shell with navigation (PM F18). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/not-found.spec.ts`
- [ ] **APP-08** (w5, WP-41) Full journey (PLAN section 15, rows 1 to 7) passes against real Postgres and Keycloak. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/journey.spec.ts`
- [x] **APP-Q1** (w2, WP-40) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/brain-app`
- [ ] **APP-Q2** (w3, WP-40) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/brain-app exec stryker run`
- [ ] **APP-Q3** (w2, WP-40) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
