# fake-guard: completion checklist

Done: **29.4% (5/17)**, 2 of 6 items. Evidence date 2026-11-13.

Scope: Fails the build when tests or src lean on fakes.

Package: `@anvesx/fake-guard`. Lead WP: WP-44. Builder / reviewer: Kiro glm-5 / Codex. Owner agent: unassigned.

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

- [x] **FG-01** (w3, WP-00) Ratchet runs: new findings fail and stale baseline entries fail. Proof: `pnpm guard:fakes`
- [ ] **FG-02** (w5, WP-44) fake-baseline.json is empty. Proof: `test "$(node -p "Object.keys(require('./fake-baseline.json')).length")" -eq 0`
- [ ] **FG-03** (w2, WP-44) Also flags HTTP interception of our own server (msw, nock) in integration, e2e and scale tiers. Proof: `pnpm --filter @anvesx/fake-guard test`
- [x] **FG-Q1** (w2, WP-44) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/fake-guard`
- [ ] **FG-Q2** (w3, WP-44) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/fake-guard exec stryker run`
- [ ] **FG-Q3** (w2, WP-44) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
