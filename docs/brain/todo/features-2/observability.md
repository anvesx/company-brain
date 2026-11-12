# observability: completion checklist

Done: **0.0% (0/27)**, 0 of 10 items. Evidence date 2026-11-13.

Scope: Logs, metrics, traces, health and SLOs (planned features/observability).

Package: `@anvesx/observability`. Lead WP: WP-15. Builder / reviewer: Kiro qwen3-coder-next / Codex. Owner agent: unassigned.

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

- [ ] **OBS-01** (w3, WP-15) pino JSON logs with request id and tenant id on every line. Proof: `pnpm vitest run tests/contract/obs-logs.test.ts`
- [ ] **OBS-02** (w3, WP-15) prom-client metrics for HTTP, queue, sync and gate latency. Proof: `pnpm vitest run tests/contract/obs-metrics.test.ts`
- [ ] **OBS-03** (w3, WP-15) /healthz per dependency (Postgres, queue, providers) (2609.05510). Proof: `pnpm vitest run tests/contract/obs-health.test.ts`
- [ ] **OBS-04** (w4, WP-15) Logs scrub tokens, cookies and email addresses. Proof: `pnpm vitest run tests/contract/obs-scrub.test.ts`
- [ ] **OBS-05** (w2, WP-15) OpenTelemetry traces across HTTP, queue and Postgres. Proof: `pnpm vitest run tests/contract/obs-traces.test.ts`
- [ ] **OBS-06** (w3, WP-15) SLOs for search, Files and webhook freshness in `docs/runbooks/slo.json`, each with target, window and alert fields, and alert rules committed. Proof: `node -e 'const s=require("./docs/runbooks/slo.json");for(const k of ["search","files","webhook-freshness"]){const x=s[k];if(!x||!x.target||!x.window||!x.alert)process.exit(1)}' && test -s docs/runbooks/alert-rules.yaml`
- [ ] **OBS-07** (w2, WP-15) Activation events: connected, first sync done, first search, first open. Proof: `pnpm vitest run tests/contract/obs-activation.test.ts`
- [ ] **OBS-Q1** (w2, WP-15) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/observability`
- [ ] **OBS-Q2** (w3, WP-15) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/observability exec stryker run`
- [ ] **OBS-Q3** (w2, WP-15) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`
