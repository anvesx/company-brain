# webhook verification: completion checklist

Done: **0.0% (0/27)**, 0 of 8 items. Evidence date 2026-11-13.

Scope: Signature checks for provider webhooks (planned features/webhook-verify).

Package: `@anvesx/webhook-verify`. Lead WP: WP-22. Builder / reviewer: Kiro glm-5 / Codex. Owner agent: unassigned.

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

- [ ] **WV-01** (w5, WP-22) GitHub X-Hub-Signature-256 checked in constant time; one flipped byte rejected. Proof: `pnpm vitest run tests/contract/webhook-github.test.ts`
- [ ] **WV-02** (w5, WP-22) Slack v0 signature checked; timestamp older than 5 min rejected (replay). Proof: `pnpm vitest run tests/contract/webhook-slack.test.ts`
- [ ] **WV-03** (w4, WP-22) Drive channel token and resource id checked against the stored channel. Proof: `pnpm vitest run tests/contract/webhook-drive.test.ts`
- [ ] **WV-04** (w3, WP-22) Repeated delivery id is a no-op. Proof: `pnpm vitest run tests/contract/webhook-replay.test.ts`
- [ ] **WV-05** (w3, WP-22) Signature computed over raw bytes before any JSON parse. Proof: `pnpm vitest run tests/contract/webhook-raw-body.test.ts`
- [ ] **WV-Q1** (w2, WP-22) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/webhook-verify`
- [ ] **WV-Q2** (w3, WP-22) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/webhook-verify exec stryker run`
- [ ] **WV-Q3** (w2, WP-22) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
