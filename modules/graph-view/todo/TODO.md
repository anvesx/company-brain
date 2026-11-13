# graph-view: completion checklist

Done: **6.1% (2/33)**, 1 of 11 items. Evidence date 2026-11-13.

Scope: The 3D graph screen, restyled and moved onto the shared gate.

Package: `@anvesx/graph-view`. Lead WP: WP-34. Builder / reviewer: Claude mid / Kiro qwen3-coder-next. Owner agent: unassigned.

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

- [ ] **GV-01** (w5, WP-10) Reads go through the shared visibility gate; src/query/visible.ts deleted (leak 3). Proof: `test ! -e modules/graph-view/src/query/visible.ts`
- [ ] **GV-02** (w4, WP-34) Empty state differs for no source, syncing, and synced with nothing visible; never says connect when connected (PM F3). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/graph-empty-states.spec.ts`
- [ ] **GV-03** (w3, WP-34) Search result row selectable by click and by keyboard (PM F12). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/graph-search-select.spec.ts`
- [ ] **GV-04** (w3, WP-34) Node detail shows display name, open-in-source link and readable version; no raw ids (PM F10). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/node-detail.spec.ts`
- [ ] **GV-05** (w3, WP-34) 10,000 visible nodes reach first paint in under 2 s (Playwright trace). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/graph-10k.spec.ts`
- [ ] **GV-06** (w3, WP-34) Zero serious axe findings; legend and detail panel keyboard reachable. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/graph-a11y.spec.ts`
- [ ] **GV-07** (w2, WP-34) Styles come from design-system tokens; no inline style attributes. Proof: `test "$(rg -c "style=" modules/graph-view/src | wc -l)" -eq 0`
- [ ] **GV-08** (w3, WP-25) HMAC cursor in query/limits.ts replaced by the shared signed opaque cursor (jose; LIB-AUDIT section 4). Proof: `pnpm vitest run tests/contract/cursor-signed.test.ts`
- [x] **GV-Q1** (w2, WP-34) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/graph-view`
- [ ] **GV-Q2** (w3, WP-34) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/graph-view exec stryker run`
- [ ] **GV-Q3** (w2, WP-34) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
