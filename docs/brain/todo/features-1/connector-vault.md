# connector vault (OAuth tokens): completion checklist

Done: **0.0% (0/36)**, 0 of 10 items. Evidence date 2026-11-13.

Scope: One encrypted store for provider tokens (planned features/connector-vault).

Package: `@anvesx/connector-vault`. Lead WP: WP-14. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **VLT-01** (w5, WP-14) One AES-256-GCM store; the second copy of the cipher code deleted. Proof: `test "$(rg -l "aes-256-gcm" features services apps | wc -l)" -eq 1`
- [ ] **VLT-02** (w5, WP-14) Row id bound as AAD; ciphertext moved to another row fails to decrypt. Proof: `pnpm vitest run tests/contract/vault-aad.test.ts`
- [ ] **VLT-03** (w4, WP-14) Key rotation re-encrypts every row with no downtime; old key then rejected. Proof: `pnpm vitest run tests/contract/vault-rotate.test.ts`
- [ ] **VLT-04** (w4, WP-14) Vault key separate from BRAIN_AUTH_SECRET; boot fails if they are equal. Proof: `pnpm vitest run tests/contract/vault-key-separate.test.ts`
- [ ] **VLT-05** (w4, WP-14) Tokens never appear in logs, errors or traces (scrub test over captured output). Proof: `pnpm vitest run tests/contract/vault-log-scrub.test.ts`
- [ ] **VLT-06** (w3, WP-14) Token-file to vault migration has a dry run and a count check. Proof: `pnpm vitest run tests/contract/vault-migrate.test.ts`
- [ ] **VLT-07** (w4, WP-14) Disconnect deletes the ciphertext row in the same transaction. Proof: `pnpm vitest run tests/contract/vault-disconnect.test.ts`
- [ ] **VLT-Q1** (w2, WP-14) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/connector-vault`
- [ ] **VLT-Q2** (w3, WP-14) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/connector-vault exec stryker run`
- [ ] **VLT-Q3** (w2, WP-14) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
