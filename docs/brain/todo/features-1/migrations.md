# migrations: completion checklist

Done: **0.0% (0/36)**, 0 of 12 items. Evidence date 2026-11-13.

Scope: Ordered, checksummed schema migrations for Postgres 16 (planned features/migrations).

Package: `@anvesx/migrations`. Lead WP: WP-02. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **MIG-01** (w4, WP-02) schema_version table records id, checksum and applied_at; a re-run applies nothing. Proof: `pnpm vitest run tests/contract/migrations-idempotent.test.ts`
- [ ] **MIG-02** (w4, WP-02) Applies cleanly from an empty database and from the current main schema. Proof: `pnpm vitest run tests/contract/migrations-from-main.test.ts`
- [ ] **MIG-03** (w4, WP-02) All 14 new tables from PLAN section 6 exist with their indexes and RLS policies. Proof: `pnpm vitest run tests/contract/schema-tables.test.ts`
- [ ] **MIG-04** (w3, WP-02) Every migration has a tested down step, or an ADR says why it is forward-only. Proof: `pnpm vitest run tests/contract/migrations-down.test.ts`
- [ ] **MIG-05** (w3, WP-02) Editing an applied migration fails boot with a checksum-drift error. Proof: `pnpm vitest run tests/contract/migrations-drift.test.ts`
- [ ] **MIG-06** (w3, WP-02) Two concurrent runners serialise on an advisory lock. Proof: `pnpm vitest run tests/contract/migrations-lock.test.ts`
- [ ] **MIG-07** (w2, WP-02) Runner is Kysely Migrator, not a hand-written loop (LIB-AUDIT section 2). Proof: `rg -q "new Migrator" features/migrations/src`
- [ ] **MIG-08** (w4, WP-02) Index builds use CONCURRENTLY; no lock held over 1 s on a 10M-edge table. Proof: `psql "$DATABASE_URL" -f tools/scale-k6/explain/migration-locks.sql`
- [ ] **MIG-09** (w2, WP-02) Schema PR merged by the owner, not an agent (A15). Proof: `test "$(gh pr view "$SCHEMA_PR" --json mergedBy --jq .mergedBy.login)" = "$OWNER_LOGIN"`
- [ ] **MIG-Q1** (w2, WP-02) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/migrations`
- [ ] **MIG-Q2** (w3, WP-02) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/migrations exec stryker run`
- [ ] **MIG-Q3** (w2, WP-02) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
