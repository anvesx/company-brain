# contract and acceptance suites: completion checklist

Done: **0.0% (0/15)**, 0 of 4 items. Evidence date 2026-11-13.

Scope: tests/contract and tests/large/acceptance: the executable spec (T1, T2).

Package: `@anvesx/-`. Lead WP: WP-01. Builder / reviewer: Claude (lead) / Codex. Owner agent: unassigned.

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

- [ ] **CTR-01** (w5, WP-01) Every C: and A: test named in these checklists exists and is red for the right reason. Proof: `pnpm vitest run tests/contract`
- [ ] **CTR-02** (w4, WP-01) CI rejects a builder PR that edits tests/contract or tests/large/acceptance. Proof: `test "$(gh run list --workflow contract-guard --limit 1 --json conclusion --jq '.[0].conclusion')" = success`
- [ ] **CTR-03** (w3, WP-01) Every row of PLAN section 4.1 is listed in `tests/contract/research-rows.json`, and each listed row id has at least one contract test tagged `[row:<id>]`; the test fails when a row has no tagged test. Proof: `pnpm vitest run tests/contract/research-rows.test.ts`
- [ ] **CTR-04** (w3, WP-01) Contract PR merged by the owner (A15). Proof: `test "$(gh pr view "$CONTRACT_PR" --json mergedBy --jq .mergedBy.login)" = "$OWNER_LOGIN"`
