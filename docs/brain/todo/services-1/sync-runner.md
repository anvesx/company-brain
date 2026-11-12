# sync runner (connectors): completion checklist

Done: **0.0% (0/43)**, 0 of 13 items. Evidence date 2026-11-13.

Scope: Runs backfill, delta and sweep jobs per connection (planned services/sync-runner).

Package: `@anvesx/sync-runner`. Lead WP: WP-21. Builder / reviewer: Codex / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [ ] **SYN-01** (w5, WP-21) Connecting a source enqueues a backfill with no operator step (PM F1). Proof: `pnpm vitest run tests/contract/connect-backfill.test.ts`
- [ ] **SYN-02** (w4, WP-21) Killed run resumes from the cursor with no duplicate node. Proof: `pnpm vitest run tests/contract/sync-resume.test.ts`
- [ ] **SYN-03** (w3, WP-21) Delta sync fetches only changes since the cursor. Proof: `pnpm vitest run tests/contract/sync-delta.test.ts`
- [ ] **SYN-04** (w3, WP-21) Poll every 15 min for sources without webhooks. Proof: `pnpm vitest run tests/contract/sync-poll.test.ts`
- [ ] **SYN-05** (w4, WP-21) 24-h sweep tombstones items deleted at the source. Proof: `pnpm vitest run tests/contract/sync-sweep.test.ts`
- [ ] **SYN-06** (w3, WP-21) Provider 429 honoured with Retry-After; no lost page. Proof: `pnpm vitest run tests/contract/sync-retry-after.test.ts`
- [ ] **SYN-07** (w3, WP-21) sync_run history with states queued, running, done, failed and a reason code. Proof: `pnpm vitest run tests/contract/sync-state.test.ts`
- [ ] **SYN-08** (w3, WP-21) At most one run per connection at a time. Proof: `pnpm vitest run tests/contract/sync-single.test.ts`
- [ ] **SYN-09** (w5, WP-21) Live GitHub and Drive accounts sync end to end on staging (owner items 3, 4). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/sync-live.spec.ts`
- [ ] **SYN-10** (w3, WP-21) Polled change visible within 15 min p95. Proof: `k6 run tools/scale-k6/scripts/poll-latency.js`
- [ ] **SYN-Q1** (w2, WP-21) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/sync-runner`
- [ ] **SYN-Q2** (w3, WP-21) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/sync-runner exec stryker run`
- [ ] **SYN-Q3** (w2, WP-21) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
