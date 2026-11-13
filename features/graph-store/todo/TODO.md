# graph-store (graph): completion checklist

Done: **18.0% (9/50)**, 3 of 16 items. Evidence date 2026-11-13.

Scope: Bitemporal node and edge store, metadata only (ADR 0004), Postgres 16 in production, SQLite fast tier.

Package: `@anvesx/graph-store`. Lead WP: WP-23. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [x] **GS-01** (w5, WP-23) Closed edge is absent from current reads and visible to an as-of read before closure (Slite, validity). Proof: `pnpm --filter @anvesx/graph-store exec vitest run tests/unit/edges.test.ts --config ../../vitest.config.ts`
- [x] **GS-02** (w2, WP-23) Edge writes and closes are scoped to their own tenant and kind at the application layer. Proof: `pnpm --filter @anvesx/graph-store exec vitest run tests/unit/edges.test.ts --config ../../vitest.config.ts`
- [ ] **GS-03** (w5, WP-23) Row-level security on every tenant table; a wrong-tenant session reads zero rows (paper 2607.21503, our proposal). Proof: `pnpm vitest run tests/contract/rls-tenant.test.ts`
- [ ] **GS-04** (w4, WP-23) No column stores document body text; schema scan finds no body/content column (Slite, pointers; ADR 0004). Proof: `pnpm vitest run tests/contract/no-content.test.ts`
- [ ] **GS-05** (w3, WP-23) Purge by source removes every node, edge and fact from that source (GBrain, facts). Proof: `pnpm vitest run tests/contract/withdraw.test.ts`
- [ ] **GS-06** (w3, WP-23) Explicit reference creates depends_on and referenced_by in both directions (Meta, links). Proof: `pnpm vitest run tests/contract/links.test.ts`
- [ ] **GS-07** (w3, WP-23) Attestation strength is computed at read time and never stored (Sola 2610.12540). Proof: `pnpm vitest run tests/contract/attest.test.ts`
- [ ] **GS-08** (w3, WP-23) Document ids are stable across resync and connector restart. Proof: `pnpm vitest run tests/contract/stable-ids.test.ts`
- [ ] **GS-09** (w3, WP-23) Batch write of 10,000 nodes runs in one transaction in under 2 s on Postgres 16. Proof: `pnpm vitest run tests/contract/batch-write.test.ts`
- [ ] **GS-10** (w4, WP-23) Hot reads (current edges by node, nodes by tenant and kind, title trigram) plan as index or bitmap scans with zero Seq Scan at 10M edges. Proof: `psql "$DATABASE_URL" -f tools/scale-k6/explain/graph-hot.sql`
- [ ] **GS-11** (w3, WP-23) Every list read uses keyset pagination; no OFFSET in src. Proof: `test "$(rg -c OFFSET features/graph-store/src | wc -l)" -eq 0`
- [ ] **GS-12** (w3, WP-23) RLS cost: p95 of hot reads with RLS on is at most 1.2x the same reads with RLS off. Proof: `psql "$DATABASE_URL" -f tools/scale-k6/explain/rls-cost.sql`
- [ ] **GS-13** (w2, WP-23) Postgres queries built with Kysely, not template SQL; SQLite tier kept hand-written by a recorded ADR (LIB-AUDIT section 2). Proof: `rg -q "kysely" features/graph-store/src/postgres`
- [x] **GS-Q1** (w2, WP-23) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/graph-store`
- [ ] **GS-Q2** (w3, WP-23) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/graph-store exec stryker run`
- [ ] **GS-Q3** (w2, WP-23) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
