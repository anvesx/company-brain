# docs: completion checklist

Done: **0.0% (0/13)**, 0 of 5 items. Evidence date 2026-11-13.

Scope: Decision records, runbooks and honest progress.

Package: `@anvesx/-`. Lead WP: WP-43. Builder / reviewer: Kiro qwen3-coder-next / Claude verifier. Owner agent: unassigned.

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

- [ ] **DOC-01** (w3, WP-43) Six new ADRs from PLAN section 12 written and accepted, numbered 0011 to 0016 under `docs/adr/<area>/`. Proof: `test "$(grep -l "Status: accepted" docs/adr/*/001[1-6]-*.md | wc -l)" -eq 6`
- [ ] **DOC-02** (w1, WP-43) research/exact/ui-landscape.md committed. Proof: `git ls-files docs/brain/research/exact/ui-landscape.md`
- [ ] **DOC-03** (w3, WP-43) docs/progress.md and README line 1 generated from this index. Proof: `git diff --exit-code docs/progress.md`
- [ ] **DOC-04** (w3, WP-43) Runbooks for deploy, rollback, restore, key-rotation and incident exist, each non-empty with a `## Steps` section. Proof: `for r in deploy rollback restore key-rotation incident; do test -s docs/runbooks/$r.md && grep -q "^## Steps" docs/runbooks/$r.md || exit 1; done`
- [ ] **DOC-05** (w3, WP-43) Privacy and data-flow statement with `## What is stored`, `## Where` and `## Retention` sections. Proof: `for h in "What is stored" "Where" "Retention"; do grep -q "^## $h" docs/brain/privacy.md || exit 1; done`
