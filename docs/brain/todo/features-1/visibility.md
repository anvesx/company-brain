# visibility gate (permissions): completion checklist

Done: **0.0% (0/53)**, 0 of 14 items. Evidence date 2026-11-13.

Scope: The one permission gate for pages, search, graph and MCP. Moves to features/visibility/todo/ when WP-10 merges.

Package: `@anvesx/visibility`. Lead WP: WP-10. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

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

- [ ] **VIS-01** (w5, WP-10) One gate; the three copies in graph-view, brain-mcp and apps deleted (leak 3). Proof: `test "$(rg -l "function visible" features services modules apps | wc -l)" -eq 1`
- [ ] **VIS-02** (w5, WP-10) As-of reads apply current permissions, never historical ones (leak 1). Proof: `pnpm vitest run tests/contract/leak-time-travel.test.ts`
- [ ] **VIS-03** (w5, WP-10) Live source recheck is mandatory and fails closed when the provider is unreachable (DEBATE-codex P0). Proof: `pnpm vitest run tests/contract/leak-live-recheck.test.ts`
- [ ] **VIS-04** (w4, WP-10) Reader lists shown only to owners and admins (leak 4). Proof: `pnpm vitest run tests/contract/leak-reader-list.test.ts`
- [ ] **VIS-05** (w5, WP-10) Leak suite: 2 tenants x 3 users over every route and MCP tool, zero cross-visibility. Proof: `pnpm vitest run tests/contract/leak-suite.test.ts`
- [ ] **VIS-06** (w3, WP-10) Email alias and group membership resolve the same way on every surface. Proof: `pnpm vitest run tests/contract/alias-parity.test.ts`
- [ ] **VIS-07** (w4, WP-10) Gate check p95 under 5 ms with 10M edges (MemLeak 2610.04195). Proof: `psql "$DATABASE_URL" -f tools/scale-k6/explain/gate-check.sql`
- [ ] **VIS-08** (w5, WP-10) Source revocation hides the item on all four surfaces at the next recheck. Proof: `pnpm vitest run tests/contract/leak-revocation.test.ts`
- [ ] **VIS-09** (w4, WP-10) No response reveals a count or existence of hidden items (leak 8). Proof: `pnpm vitest run tests/contract/leak-hidden-count.test.ts`
- [ ] **VIS-10** (w4, WP-10) Two real Google accounts see different results for the same query on staging. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/visibility-live.spec.ts`
- [ ] **VIS-11** (w2, WP-10) "Why you can see this" names the access basis without naming hidden items (PM F4). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/access-basis.spec.ts`
- [ ] **VIS-Q1** (w2, WP-10) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/visibility`
- [ ] **VIS-Q2** (w3, WP-10) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/visibility exec stryker run`
- [ ] **VIS-Q3** (w2, WP-10) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
