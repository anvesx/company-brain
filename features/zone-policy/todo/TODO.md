# zone-policy: completion checklist

Done: **10.0% (2/20)**, 1 of 6 items. Evidence date 2026-11-13.

Scope: Data zones as a query-time permission check (leak 5).

Package: `@anvesx/zone-policy`. Lead WP: WP-10. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

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

- [ ] **ZP-01** (w5, WP-10) Zone stored on connection and node rows. Proof: `pnpm vitest run tests/contract/zone-stored.test.ts`
- [ ] **ZP-02** (w5, WP-10) Zone checked inside the shared gate; a zone-denied item is hidden on pages, search, graph and MCP. Proof: `pnpm vitest run tests/contract/leak-zone.test.ts`
- [ ] **ZP-03** (w3, WP-10) Zone change on a connection takes effect at the next recheck. Proof: `pnpm vitest run tests/contract/zone-change.test.ts`
- [x] **ZP-Q1** (w2, WP-10) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/zone-policy`
- [ ] **ZP-Q2** (w3, WP-10) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/zone-policy exec stryker run`
- [ ] **ZP-Q3** (w2, WP-10) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
