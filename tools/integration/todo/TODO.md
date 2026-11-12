# integration harness: completion checklist

Done: **13.3% (2/15)**, 1 of 6 items. Evidence date 2026-11-13.

Scope: Cross-package tests on Postgres 16.

Package: `@anvesx/integration`. Lead WP: WP-41. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **INT-01** (w4, WP-41) Sync to graph to gate to search runs on Postgres 16 in CI. Proof: `pnpm --filter @anvesx/integration integration`
- [ ] **INT-02** (w2, WP-25) Harness paths for query-router, source-trust and zone-policy removed once those are wired or deleted. Proof: `test "$(rg -c "query-router|source-trust|zone-policy" tools/integration/src | wc -l)" -eq 0`
- [ ] **INT-03** (w2, WP-25) graph-docs.ts title match replaced by the search service client. Proof: `test ! -e tools/integration/src/graph-docs.ts`
- [x] **INT-Q1** (w2, WP-41) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/integration`
- [ ] **INT-Q2** (w3, WP-41) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/integration exec stryker run`
- [ ] **INT-Q3** (w2, WP-41) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
