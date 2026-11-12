# job queue: completion checklist

Done: **0.0% (0/37)**, 0 of 12 items. Evidence date 2026-11-13.

Scope: Durable Postgres-backed jobs for sync, refresh, webhooks and nightly builds (planned features/job-queue).

Package: `@anvesx/job-queue`. Lead WP: WP-03. Builder / reviewer: Codex / Kiro glm-5. Owner agent: unassigned.

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

- [ ] **JQ-01** (w2, WP-03) pg-boss chosen by recorded ADR: licence MIT, Node 22 support, Postgres 16 tested. Proof: `test -n "$(ls docs/adr/*/*job-queue*.md)" && grep -q "Status: accepted" docs/adr/*/*job-queue*.md`
- [ ] **JQ-02** (w5, WP-03) A job in flight when the worker gets SIGKILL completes exactly once after restart. Proof: `pnpm vitest run tests/contract/queue-crash.test.ts`
- [ ] **JQ-03** (w4, WP-03) Same idempotency key enqueued twice runs once. Proof: `pnpm vitest run tests/contract/queue-idempotent.test.ts`
- [ ] **JQ-04** (w2, WP-03) Callers import only the queue port; pg-boss imported in one adapter file. Proof: `test "$(rg -l "from .pg-boss" features services apps | wc -l)" -eq 1`
- [ ] **JQ-05** (w3, WP-03) Retries with back-off, then a dead-letter row visible to admins. Proof: `pnpm vitest run tests/contract/queue-dlq.test.ts`
- [ ] **JQ-06** (w4, WP-03) Per-tenant fairness: one tenant's 100,000-job backlog does not delay another tenant past 30 s. Proof: `pnpm vitest run tests/contract/queue-fairness.test.ts`
- [ ] **JQ-07** (w3, WP-03) Cron jobs registered: 15-min poll, 24-h sweep, nightly cluster build. Proof: `pnpm vitest run tests/contract/queue-cron.test.ts`
- [ ] **JQ-08** (w4, WP-03) 1,000 jobs per second sustained with p95 queue lag under 5 s. Proof: `k6 run tools/scale-k6/scripts/queue-throughput.js`
- [ ] **JQ-09** (w3, WP-03) 10x burst for 5 min loses no job. Proof: `k6 run tools/scale-k6/scripts/queue-burst.js`
- [ ] **JQ-Q1** (w2, WP-03) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/job-queue`
- [ ] **JQ-Q2** (w3, WP-03) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/job-queue exec stryker run`
- [ ] **JQ-Q3** (w2, WP-03) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
