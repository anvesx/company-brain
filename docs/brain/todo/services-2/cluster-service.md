# cluster service (files view API): completion checklist

Done: **0.0% (0/26)**, 0 of 9 items. Evidence date 2026-11-13.

Scope: Serves per-viewer cluster trees and file projections (planned services/clusters).

Package: `@anvesx/cluster-service`. Lead WP: WP-32. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

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

- [ ] **CLS-01** (w5, WP-32) Counts are per viewer; a cluster with no visible file is absent. Proof: `pnpm vitest run tests/contract/leak-cluster-count.test.ts`
- [ ] **CLS-02** (w3, WP-32) File projection lists each visible file with its cluster paths. Proof: `pnpm vitest run tests/contract/cluster-projection.test.ts`
- [ ] **CLS-03** (w2, WP-32) Nightly build writes a cluster_build row with status and timings. Proof: `pnpm vitest run tests/contract/cluster-nightly.test.ts`
- [ ] **CLS-04** (w2, WP-32) Orphan report lists files in no topic cluster (Karpathy, lint). Proof: `pnpm vitest run tests/contract/cluster-orphans.test.ts`
- [ ] **CLS-05** (w3, WP-32) Cluster tree p95 under 150 ms at 100,000 files. Proof: `k6 run tools/scale-k6/scripts/cluster-tree.js`
- [ ] **CLS-06** (w4, WP-32) Disconnect purges that source from every cluster. Proof: `pnpm vitest run tests/contract/cluster-purge.test.ts`
- [ ] **CLS-Q1** (w2, WP-32) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/cluster-service`
- [ ] **CLS-Q2** (w3, WP-32) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/cluster-service exec stryker run`
- [ ] **CLS-Q3** (w2, WP-32) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
