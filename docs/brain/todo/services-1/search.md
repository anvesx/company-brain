# search: completion checklist

Done: **0.0% (0/34)**, 0 of 10 items. Evidence date 2026-11-13.

Scope: Permission-safe search over metadata with citations (planned services/search).

Package: `@anvesx/search`. Lead WP: WP-25. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

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

- [ ] **SRCH-01** (w5, WP-25) Every hit carries a citation: source, locator, fetched-at (Slite, answers). Proof: `pnpm vitest run tests/contract/search-citation.test.ts`
- [ ] **SRCH-02** (w3, WP-25) Pipeline: route, retrieve per cluster, fuse with RRF (Meta, retrieval). Proof: `pnpm vitest run tests/contract/search-rrf.test.ts`
- [ ] **SRCH-03** (w5, WP-25) Signed opaque cursor; page shape never reveals hidden counts (leak 8). Proof: `pnpm vitest run tests/contract/leak-cursor.test.ts`
- [ ] **SRCH-04** (w4, WP-25) Gate applied, then live recheck on the top k before return. Proof: `pnpm vitest run tests/contract/search-recheck.test.ts`
- [ ] **SRCH-05** (w5, WP-25) p95 under 200 ms at 200 requests per second over 100,000 files. Proof: `k6 run tools/scale-k6/scripts/search.js`
- [ ] **SRCH-06** (w3, WP-25) Search plans as index scans with keyset paging. Proof: `psql "$DATABASE_URL" -f tools/scale-k6/explain/search.sql`
- [ ] **SRCH-07** (w2, WP-25) Zero-result and partial-source states returned explicitly. Proof: `pnpm vitest run tests/contract/search-states.test.ts`
- [ ] **SRCH-Q1** (w2, WP-25) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/search`
- [ ] **SRCH-Q2** (w3, WP-25) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/search exec stryker run`
- [ ] **SRCH-Q3** (w2, WP-25) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
