# apps/connections (to delete): completion checklist

Done: **0.0% (0/10)**, 0 of 3 items. Evidence date 2026-11-13.

Scope: Legacy app. Done means deleted after modules/connections replaces it.

Package: `@anvesx/connections-app`. Lead WP: WP-40. Builder / reviewer: Claude mid / Codex. Owner agent: unassigned.

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

- [ ] **ACN-01** (w5, WP-14) Plaintext token file writer (src/tokens/write-token-file.ts) deleted (PLAN section 8). Proof: `test ! -e apps/connections/src/tokens/write-token-file.ts`
- [ ] **ACN-02** (w3, WP-40) Every route has a replacement in modules/connections; folder deleted. Proof: `test ! -d apps/connections`
- [ ] **ACN-03** (w2, WP-40) Dockerfile, workspace and CI no longer name the package. Proof: `test "$(rg -c connections-app Dockerfile pnpm-workspace.yaml .github | wc -l)" -eq 0`
