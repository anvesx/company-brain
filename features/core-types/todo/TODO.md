# core-types: completion checklist

Done: **12.5% (2/16)**, 1 of 7 items. Evidence date 2026-11-13.

Scope: Shared domain types and zod schemas every package validates against.

Package: `@anvesx/core-types`. Lead WP: WP-23. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **CT-01** (w3, WP-23) Node, edge, pointer and ACL shapes are zod schemas; no hand-written shape guard remains in any package (LIB-AUDIT section 1). Proof: `pnpm vitest run tests/contract/core-types-schemas.test.ts`
- [ ] **CT-02** (w3, WP-23) Pointer requires source, locator and fetchedAt, so every downstream hit can cite (Slite, answers). Proof: `pnpm vitest run tests/contract/citation-shape.test.ts`
- [ ] **CT-03** (w2, WP-23) Tenant and zone ids are branded types; passing one for the other fails tsc. Proof: `pnpm --filter @anvesx/core-types exec tsc -p tests/types`
- [ ] **CT-04** (w1, WP-23) Exports map exposes one public entry; no deep import into src from another package. Proof: `pnpm deps`
- [x] **CT-Q1** (w2, WP-23) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/core-types`
- [ ] **CT-Q2** (w3, WP-23) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/core-types exec stryker run`
- [ ] **CT-Q3** (w2, WP-23) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
