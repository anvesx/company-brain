# graph-sync: completion checklist

Done: **18.5% (5/27)**, 2 of 9 items. Evidence date 2026-11-13.

Scope: Writes connector output into the graph: nodes, ACL edges, tombstones.

Package: `@anvesx/graph-sync`. Lead WP: WP-21. Builder / reviewer: Codex / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [x] **GSY-01** (w3, WP-21) Addresses namespaced per connector; tombstones touch only that connector's documents. Proof: `pnpm --filter @anvesx/graph-sync exec vitest run tests/unit/safety --config ../../vitest.config.ts`
- [ ] **GSY-02** (w4, WP-21) Typed edges from explicit references with no network or model call (GBrain, edges). Proof: `pnpm vitest run tests/contract/typed-edges.test.ts`
- [ ] **GSY-03** (w4, WP-21) One bad item writes a sync_error row with retry_at and never aborts the run. Proof: `pnpm vitest run tests/contract/sync-error.test.ts`
- [ ] **GSY-04** (w4, WP-21) 100,000-file backfill completes in under 30 min on Postgres 16 with 1,000-item transactions. Proof: `k6 run tools/scale-k6/scripts/backfill.js`
- [ ] **GSY-05** (w3, WP-14) Tokens read per job from the vault; never from a token file. Proof: `pnpm vitest run tests/contract/token-per-job.test.ts`
- [ ] **GSY-06** (w2, WP-15) Metrics for items per second, errors and lag per connection exported. Proof: `pnpm vitest run tests/contract/sync-metrics.test.ts`
- [x] **GSY-Q1** (w2, WP-21) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/graph-sync`
- [ ] **GSY-Q2** (w3, WP-21) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/graph-sync exec stryker run`
- [ ] **GSY-Q3** (w2, WP-21) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
