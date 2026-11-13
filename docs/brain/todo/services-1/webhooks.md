# webhooks: completion checklist

Done: **0.0% (0/29)**, 0 of 9 items. Evidence date 2026-11-13.

Scope: Receives provider webhooks and turns them into delta jobs (planned services/webhooks).

Package: `@anvesx/webhooks`. Lead WP: WP-22. Builder / reviewer: Kiro glm-5 / Codex. Owner agent: unassigned.

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

- [ ] **WH-01** (w4, WP-22) Ack within 500 ms; work done on the queue. Proof: `pnpm vitest run tests/contract/webhook-ack.test.ts`
- [ ] **WH-02** (w3, WP-22) Drive watch channels renewed before expiry. Proof: `pnpm vitest run tests/contract/webhook-renew.test.ts`
- [ ] **WH-03** (w5, WP-22) Webhook to visible-in-search p95 under 60 s. Proof: `k6 run tools/scale-k6/scripts/webhook-freshness.js`
- [ ] **WH-04** (w3, WP-22) Invalid signature returns 401 and increments a metric. Proof: `pnpm vitest run tests/contract/webhook-invalid.test.ts`
- [ ] **WH-05** (w4, WP-22) Live Drive change delivered and applied on staging. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/webhook-live.spec.ts`
- [ ] **WH-06** (w3, WP-22) 1,000 deliveries per second burst, none lost. Proof: `k6 run tools/scale-k6/scripts/webhook-burst.js`
- [ ] **WH-Q1** (w2, WP-22) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/webhooks`
- [ ] **WH-Q2** (w3, WP-22) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/webhooks exec stryker run`
- [ ] **WH-Q3** (w2, WP-22) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
