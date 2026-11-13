# identity (Google-only sign-in): completion checklist

Done: **13.2% (7/53)**, 2 of 16 items. Evidence date 2026-11-13.

Scope: Sign-in, sessions and headers. Google OIDC is the only way in.

Package: `@anvesx/identity`. Lead WP: WP-11. Builder / reviewer: Codex / Kiro glm-5. Owner agent: unassigned.

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

- [ ] **ID-01** (w5, WP-11) No password or passkey route: sign-in/email, sign-up/email and passkey endpoints return 404. Proof: `pnpm vitest run tests/contract/no-password-routes.test.ts`
- [ ] **ID-02** (w5, WP-11) Google OIDC with state, nonce and PKCE passes end to end against a real Keycloak container. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/oidc-keycloak.spec.ts`
- [ ] **ID-03** (w4, WP-11) id_token without email_verified=true is rejected. Proof: `pnpm vitest run tests/contract/verified-email.test.ts`
- [ ] **ID-04** (w3, WP-11) Hosted-domain allow-list enforced; a disallowed domain gets a named error page. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/domain-denied.spec.ts`
- [ ] **ID-05** (w4, WP-11) Session cookie is HttpOnly, Secure, SameSite=Lax, rotated at sign-in and revocable server-side. Proof: `pnpm vitest run tests/contract/session-cookie.test.ts`
- [ ] **ID-06** (w3, WP-11) HSTS, CSP, nosniff and referrer-policy headers on every page. Proof: `pnpm vitest run tests/contract/headers.test.ts`
- [ ] **ID-07** (w3, WP-11) Client address read from X-Forwarded-For only when proxy trust is on in production. Proof: `pnpm vitest run tests/contract/proxy-trust.test.ts`
- [x] **ID-08** (w5, WP-11) Connector token seal fails closed on wrong key, wrong field or one flipped byte. Proof: `pnpm --filter @anvesx/identity exec vitest run tests/unit/connectors/seal.test.ts --config ../../vitest.config.ts`
- [ ] **ID-09** (w3, WP-11) Package split in two; neither half holds more than 30 source files (PLAN 5.1). Proof: `test "$(ls -d features/identity* | wc -l)" -eq 2 && for d in features/identity*; do test "$(find $d/src -name "*.ts" | wc -l)" -le 30 || exit 1; done`
- [ ] **ID-10** (w2, WP-11) Config parsed by one zod schema; a bad value exits non-zero (LIB-AUDIT section 3). Proof: `pnpm vitest run tests/contract/identity-config.test.ts`
- [ ] **ID-11** (w2, WP-11) Pages rendered with hono/jsx; hand-written esc() deleted (LIB-AUDIT section 7). Proof: `test "$(rg -c "esc\(" features/identity/src | wc -l)" -eq 0`
- [ ] **ID-12** (w2, WP-11) Sign-in rate limit persisted in Postgres, survives restart. Proof: `pnpm vitest run tests/contract/signin-ratelimit.test.ts`
- [ ] **ID-13** (w5, WP-11) Real Google sign-in on the staging host with the owner's client (owner items 1, 2). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/google-live.spec.ts`
- [x] **ID-Q1** (w2, WP-11) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/identity`
- [ ] **ID-Q2** (w3, WP-11) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/identity exec stryker run`
- [ ] **ID-Q3** (w2, WP-11) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
