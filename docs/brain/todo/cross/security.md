# security: completion checklist

Done: **0.0% (0/27)**, 0 of 8 items. Evidence date 2026-11-13.

Scope: Cross-cutting security gates.

Package: `@anvesx/-`. Lead WP: WP-45. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **SEC-01** (w5, WP-45) Adversarial review by a second vendor finds zero high issues. Rubric: `docs/brain/evidence/security-review.md` carries `Builder-vendor:`, `Reviewer-vendor:` (different), `High findings: 0`, and a review PR approved by a human owner; a contract test guards known vulnerability patterns. Proof: `pnpm vitest run tests/contract/security-regression.test.ts && E=docs/brain/evidence/security-review.md && test "$(sed -n "s/^Builder-vendor: //p" $E)" != "$(sed -n "s/^Reviewer-vendor: //p" $E)" && grep -qx "High findings: 0" $E && test "$(gh pr view "$SEC_REVIEW_PR" --json reviews --jq "[.reviews[]|select(.state==\"APPROVED\")]|length")" -ge 1`
- [ ] **SEC-02** (w3, WP-45) gitleaks clean on full history. Proof: `gitleaks detect --source .`
- [ ] **SEC-03** (w3, WP-45) osv-scanner shows no high or critical advisory. Proof: `osv-scanner --lockfile pnpm-lock.yaml`
- [ ] **SEC-04** (w3, WP-45) CSRF protection on every state-changing form. Proof: `pnpm vitest run tests/contract/csrf.test.ts`
- [ ] **SEC-05** (w4, WP-45) Outbound fetches block private and metadata addresses (ipaddr.js). Proof: `pnpm vitest run tests/contract/ssrf.test.ts`
- [ ] **SEC-06** (w3, WP-45) zod at every boundary; fuzz run over route inputs finds no 5xx. Proof: `pnpm vitest run tests/contract/fuzz-routes.test.ts`
- [ ] **SEC-07** (w2, WP-45) STRIDE threat model written, with S, T, R, I, D and E sections, and reviewed by a named reviewer who is not the author. Proof: `T=docs/brain/threat-model.md && for s in Spoofing Tampering Repudiation "Information disclosure" "Denial of service" "Elevation of privilege"; do grep -q "^## $s" $T || exit 1; done && test -n "$(sed -n "s/^Author: //p" $T)" && test -n "$(sed -n "s/^Reviewed-by: //p" $T)" && test "$(sed -n "s/^Author: //p" $T)" != "$(sed -n "s/^Reviewed-by: //p" $T)"`
- [ ] **SEC-08** (w4, WP-45) Tenant erasure removes every row and token, with a completion report. Proof: `pnpm vitest run tests/contract/tenant-erasure.test.ts`
