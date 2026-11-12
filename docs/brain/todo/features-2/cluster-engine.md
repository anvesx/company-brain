# cluster engine (clusters): completion checklist

Done: **0.0% (0/39)**, 0 of 12 items. Evidence date 2026-11-13.

Scope: Builds Place, People and Topic clusters from metadata only (planned features/cluster-engine).

Package: `@anvesx/cluster-engine`. Lead WP: WP-30. Builder / reviewer: Claude mid / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [ ] **CLE-01** (w5, WP-30) Same input gives a byte-identical cluster tree. Proof: `pnpm vitest run tests/contract/cluster-deterministic.test.ts`
- [ ] **CLE-02** (w3, WP-30) Place clusters mirror source folders and repositories. Proof: `pnpm vitest run tests/contract/cluster-place.test.ts`
- [ ] **CLE-03** (w3, WP-30) People clusters group by owner and frequent editors. Proof: `pnpm vitest run tests/contract/cluster-people.test.ts`
- [ ] **CLE-04** (w4, WP-30) Topic clusters: farthest-first seeds, at most 16 children, cosine 0.88 merge, at most 3 levels (EGCForest 2610.19836; GraphRAG 2404.16130). Proof: `pnpm vitest run tests/contract/cluster-topic.test.ts`
- [ ] **CLE-05** (w5, WP-30) No document body text read or stored; titles and metadata only (ADR 0004). Proof: `pnpm vitest run tests/contract/cluster-no-content.test.ts`
- [ ] **CLE-06** (w3, WP-30) A new file is placed into existing clusters in under 1 s (LightRAG, incremental). Proof: `pnpm vitest run tests/contract/cluster-place-new.test.ts`
- [ ] **CLE-07** (w2, WP-30) Library versus hand-written clustering decided by ADR with a benchmark. Proof: `test -n "$(ls docs/adr/*/*cluster*.md)" && grep -q "Status: accepted" docs/adr/*/*cluster*.md`
- [ ] **CLE-08** (w3, WP-30) Topic labels judged useful by the owner on a real tenant. Rubric: 20 labels sampled at random; each scored `useful` when the owner can predict the folder contents from the label alone; pass at 16 of 20; the owner signs the evidence file. Proof: `E=docs/brain/evidence/cluster-quality.md && test "$(grep -cE "^- L[0-9]{2}: (not )?useful$" $E)" -eq 20 && test "$(grep -cE "^- L[0-9]{2}: useful$" $E)" -ge 16 && grep -qE "^Signed-off-by: .+" $E`
- [ ] **CLE-09** (w4, WP-30) 100,000-file build under 10 min and under 2 GB memory. Proof: `k6 run tools/scale-k6/scripts/cluster-build.js`
- [ ] **CLE-Q1** (w2, WP-30) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/cluster-engine`
- [ ] **CLE-Q2** (w3, WP-30) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/cluster-engine exec stryker run`
- [ ] **CLE-Q3** (w2, WP-30) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
