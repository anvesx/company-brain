# audit log: completion checklist

Done: **0.0% (0/27)**, 0 of 9 items. Evidence date 2026-11-13.

Scope: Append-only record of who read, changed or approved what (planned features/audit-log).

Package: `@anvesx/audit-log`. Lead WP: WP-15. Builder / reviewer: Kiro glm-5 / Codex. Owner agent: unassigned.

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

- [ ] **AUD-01** (w2, WP-15) Registry checked first (C1); install, extract or build decision recorded. Proof: `test -n "$(ls docs/adr/*/*audit*.md)" && grep -q "Status: accepted" docs/adr/*/*audit*.md`
- [ ] **AUD-02** (w5, WP-15) Append-only hash chain; editing one row breaks verification (Corezoid, audit). Proof: `pnpm vitest run tests/contract/audit-chain.test.ts`
- [ ] **AUD-03** (w4, WP-15) Events covered: sign-in, connect, disconnect, search, open, MCP call, approval, erasure. Proof: `pnpm vitest run tests/contract/audit-coverage.test.ts`
- [ ] **AUD-04** (w3, WP-15) A search event stores enough to replay why each result was returned (2607.04391). Proof: `pnpm vitest run tests/contract/audit-replay.test.ts`
- [ ] **AUD-05** (w3, WP-15) 90-day retention job and CSV export for admins. Proof: `pnpm vitest run tests/contract/audit-export.test.ts`
- [ ] **AUD-06** (w3, WP-15) Monthly partitions; insert p95 under 2 ms at 5,000 events per second. Proof: `k6 run tools/scale-k6/scripts/audit-insert.js`
- [ ] **AUD-Q1** (w2, WP-15) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/audit-log`
- [ ] **AUD-Q2** (w3, WP-15) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/audit-log exec stryker run`
- [ ] **AUD-Q3** (w2, WP-15) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
