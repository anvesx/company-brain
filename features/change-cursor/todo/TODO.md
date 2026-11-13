# change-cursor: completion checklist

Done: **9.1% (2/22)**, 1 of 8 items. Evidence date 2026-11-13.

Scope: Per-connection, per-stream delta position used by the sync runner.

Package: `@anvesx/change-cursor`. Lead WP: WP-21. Builder / reviewer: Codex / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [ ] **CC-01** (w4, WP-21) Cursor stored per connection and stream in sync_cursor; resume after a crash fetches no duplicate (DBLog, Percolator, our proposal). Proof: `pnpm vitest run tests/contract/cursor-resume.test.ts`
- [ ] **CC-02** (w4, WP-21) Cursor advances only in the same transaction that commits the batch. Proof: `pnpm vitest run tests/contract/cursor-atomic.test.ts`
- [ ] **CC-03** (w3, WP-21) An expired or rejected provider cursor triggers a full sweep, never a silent skip. Proof: `pnpm vitest run tests/contract/cursor-expired.test.ts`
- [ ] **CC-04** (w2, WP-21) Hand-written validators in model/schema.ts replaced by zod (LIB-AUDIT section 1). Proof: `rg -q "from \"zod\"" features/change-cursor/src/model/schema.ts && ! rg -q "typeof" features/change-cursor/src/model/schema.ts`
- [ ] **CC-05** (w2, WP-21) Cursor upsert plans as a primary-key index scan. Proof: `psql "$DATABASE_URL" -f tools/scale-k6/explain/cursor-upsert.sql`
- [x] **CC-Q1** (w2, WP-21) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/change-cursor`
- [ ] **CC-Q2** (w3, WP-21) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/change-cursor exec stryker run`
- [ ] **CC-Q3** (w2, WP-21) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
