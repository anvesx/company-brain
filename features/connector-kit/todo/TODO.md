# connector-kit: completion checklist

Done: **6.1% (2/33)**, 1 of 10 items. Evidence date 2026-11-13.

Scope: Adapter contract and paging helpers shared by GitHub, Drive and Slack connectors.

Package: `@anvesx/connector-kit`. Lead WP: WP-21. Builder / reviewer: Codex / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [ ] **CK-01** (w4, WP-44) fake-scale test replaced by a real-tier scale test; its fake-guard baseline entry removed. Proof: `pnpm guard:fakes`
- [ ] **CK-02** (w5, WP-21) Adapter contract (list, changes(cursor), acl(item), revoke) implemented and tested for GitHub, Drive and Slack. Proof: `pnpm vitest run tests/contract/adapter-contract.test.ts`
- [ ] **CK-03** (w5, WP-21) Unknown or unreadable ACL yields no read edge (fail closed). Proof: `pnpm vitest run tests/contract/fail-closed-acl.test.ts`
- [ ] **CK-04** (w3, WP-21) Retry-After honoured and exponential back-off via p-retry, not a local loop (LIB-AUDIT section 6). Proof: `pnpm vitest run tests/contract/rate-limit.test.ts`
- [ ] **CK-05** (w4, WP-21) Only the folders or repositories the admin selected are fetched (Vectorize, ingestion). Proof: `pnpm vitest run tests/contract/scope.test.ts`
- [ ] **CK-06** (w2, WP-21) Paging eviction map in core/paging/walks.ts replaced by lru-cache (LIB-AUDIT section 6). Proof: `rg -q "lru-cache" features/connector-kit/src`
- [ ] **CK-07** (w3, WP-21) @anvesx/connectors pinned to a release with webhook parsing and change listing (PLAN section 8). Proof: `pnpm why @anvesx/connectors`
- [x] **CK-Q1** (w2, WP-21) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/connector-kit`
- [ ] **CK-Q2** (w3, WP-21) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/connector-kit exec stryker run`
- [ ] **CK-Q3** (w2, WP-21) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
