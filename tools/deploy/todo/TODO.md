# deploy: completion checklist

Done: **5.0% (2/40)**, 1 of 13 items. Evidence date 2026-11-13.

Scope: One image on Cloud Run with Cloud SQL Postgres 16 (ADR 0010).

Package: `@anvesx/deploy`. Lead WP: WP-42. Builder / reviewer: Kiro qwen3-coder-next / Claude verifier. Owner agent: unassigned.

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

- [ ] **DEP-01** (w4, WP-42) Image builds from a clean clone with a frozen install. Proof: `docker build --secret id=npm_token,env=NODE_AUTH_TOKEN -t company-brain:test .`
- [ ] **DEP-02** (w3, WP-42) Image runs locally against Postgres 16; /healthz returns 200. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/image-local.spec.ts`
- [ ] **DEP-03** (w4, WP-42) Migrations run as a separate job before the new revision takes traffic. Proof: `pnpm --filter @anvesx/deploy test -- workflow`
- [ ] **DEP-04** (w3, WP-42) Secrets read from Secret Manager; docker history and gitleaks show none in layers or files. Proof: `gitleaks detect --source . && docker history --no-trunc company-brain:test`
- [ ] **DEP-05** (w3, WP-42) Sync worker runs as its own Cloud Run service from the same image. Proof: `pnpm --filter @anvesx/deploy test -- workflow`
- [ ] **DEP-06** (w5, WP-42) Deployed revision on Cloud Run against Cloud SQL passes the smoke suite (owner item 6). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/routes-smoke --base-url $STAGING_URL.spec.ts`
- [ ] **DEP-07** (w4, WP-42) Daily backup and one timed restore: RPO 24 h, RTO under 1 h. Restore runbook at `docs/runbooks/restore.md` records `Drill-restore-minutes: <n>` from a timed drill, and `tools/deploy/tests/workflow/restore.test.ts` covers the restore workflow. Proof: `test -f docs/runbooks/restore.md && pnpm --filter @anvesx/deploy test -- restore && test "$(sed -n "s/^Drill-restore-minutes: //p" docs/runbooks/restore.md)" -lt 60`
- [ ] **DEP-08** (w3, WP-42) Rollback to the previous revision rehearsed in under 5 min. Proof: `gcloud run services update-traffic brain --to-revisions PREV=100`
- [ ] **DEP-09** (w3, WP-42) Instance count and Cloud SQL pool sized for 1M users with a written calculation, checked by SCL-02. Proof: `k6 run tools/scale-k6/scripts/million-users.js`
- [ ] **DEP-10** (w1, WP-43) ADR 0010 status moved from proposed to accepted after DEP-06. Proof: `rg -n "Status: accepted" docs/adr/tooling/0010-deploy-cloud-run-postgres.md`
- [x] **DEP-Q1** (w2, WP-42) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/deploy`
- [ ] **DEP-Q2** (w3, WP-42) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/deploy exec stryker run`
- [ ] **DEP-Q3** (w2, WP-42) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
