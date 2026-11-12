# UI: Files view: completion checklist

Done: **0.0% (0/32)**, 0 of 10 items. Evidence date 2026-11-13.

Scope: Inventory of every file the viewer may see, with its cluster paths.

Package: `@anvesx/ui-files`. Lead WP: WP-32. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

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

- [ ] **UIF-01** (w5, WP-32) Every visible file listed with up to 3 cluster paths; no hidden file (PM F2). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/files-view.spec.ts`
- [ ] **UIF-02** (w3, WP-32) Filter, sort, keyset paging and empty state. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/files-filter.spec.ts`
- [ ] **UIF-03** (w3, WP-32) File detail with owner, freshness and open-in-source. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/file-detail.spec.ts`
- [ ] **UIF-04** (w3, WP-32) Cluster tree browsable. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/clusters-tree.spec.ts`
- [ ] **UIF-05** (w5, WP-32) TTFB p95 under 300 ms at 100,000 files. Proof: `k6 run tools/scale-k6/scripts/files.js`
- [ ] **UIF-06** (w3, WP-32) axe clean; table navigable by keyboard. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/files-a11y.spec.ts`
- [ ] **UIF-07** (w3, WP-32) Item revoked at the source shows a removed state on next load. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/files-revoked.spec.ts`
- [ ] **UIF-Q1** (w2, WP-32) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/ui-files`
- [ ] **UIF-Q2** (w3, WP-32) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/ui-files exec stryker run`
- [ ] **UIF-Q3** (w2, WP-32) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
