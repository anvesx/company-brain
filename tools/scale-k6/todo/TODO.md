# scale (k6): completion checklist

Done: **5.0% (2/40)**, 1 of 23 items. Evidence date 2026-11-13.

Scope: Load proof for 1M users. Per-route budgets live with the owning module; this file owns the harness and the mixed run.

Package: `@anvesx/scale-k6`. Lead WP: WP-46. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **SCL-01** (w4, WP-41) Deterministic seed generator: 100,000 files, 10M edges, 1M users across 1,000 tenants. Proof: `pnpm --filter @anvesx/scale-k6 seed --check`
- [ ] **SCL-02** (w5, WP-46) 1M-user-shaped mixed load (10,000 concurrent sessions): p95 under 300 ms, error rate under 0.1%. Proof: `k6 run tools/scale-k6/scripts/million-users.js`
- [ ] **SCL-03** (w3, WP-46) 2 h soak: memory growth under 10%, no connection leak. Proof: `k6 run tools/scale-k6/scripts/soak.js`
- [ ] **SCL-04** (w3, WP-46) Every k6 result committed as JSON with commit hash and machine spec; at least one result exists and every result has `commit` and `machine` fields. Proof: `ls tools/scale-k6/results/*.json > /dev/null && for f in tools/scale-k6/results/*.json; do node -e 'const r=require(process.argv[1]);if(!r.commit||!r.machine)process.exit(1)' "$f" || exit 1; done`
- [ ] **SCL-05** (w2, WP-46) EXPLAIN checks for every hot query run in CI and fail on a Seq Scan over 10,000 rows. Proof: `pnpm --filter @anvesx/scale-k6 explain`
- [ ] **SCL-06** (w1, WP-46) Create `tools/scale-k6/scripts/poll-latency.js` (used by SYN-10); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/poll-latency.js && k6 inspect tools/scale-k6/scripts/poll-latency.js`
- [ ] **SCL-07** (w1, WP-46) Create `tools/scale-k6/scripts/files.js` (used by UIF-05); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/files.js && k6 inspect tools/scale-k6/scripts/files.js`
- [ ] **SCL-08** (w1, WP-46) Create `tools/scale-k6/scripts/queue-throughput.js` (used by JQ-08); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/queue-throughput.js && k6 inspect tools/scale-k6/scripts/queue-throughput.js`
- [ ] **SCL-09** (w1, WP-46) Create `tools/scale-k6/scripts/queue-burst.js` (used by JQ-09); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/queue-burst.js && k6 inspect tools/scale-k6/scripts/queue-burst.js`
- [ ] **SCL-10** (w1, WP-46) Create `tools/scale-k6/scripts/cluster-build.js` (used by CLE-09); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/cluster-build.js && k6 inspect tools/scale-k6/scripts/cluster-build.js`
- [ ] **SCL-11** (w1, WP-46) Create `tools/scale-k6/scripts/search.js` (used by SRCH-05); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/search.js && k6 inspect tools/scale-k6/scripts/search.js`
- [ ] **SCL-12** (w1, WP-46) Create `tools/scale-k6/scripts/audit-insert.js` (used by AUD-06); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/audit-insert.js && k6 inspect tools/scale-k6/scripts/audit-insert.js`
- [ ] **SCL-13** (w1, WP-46) Create `tools/scale-k6/scripts/webhook-freshness.js` (used by WH-03); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/webhook-freshness.js && k6 inspect tools/scale-k6/scripts/webhook-freshness.js`
- [ ] **SCL-14** (w1, WP-46) Create `tools/scale-k6/scripts/webhook-burst.js` (used by WH-06); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/webhook-burst.js && k6 inspect tools/scale-k6/scripts/webhook-burst.js`
- [ ] **SCL-15** (w1, WP-46) Create `tools/scale-k6/scripts/cluster-tree.js` (used by CLS-05); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/cluster-tree.js && k6 inspect tools/scale-k6/scripts/cluster-tree.js`
- [ ] **SCL-16** (w1, WP-46) Create `tools/scale-k6/scripts/mcp-search.js` (used by MCP-13); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/mcp-search.js && k6 inspect tools/scale-k6/scripts/mcp-search.js`
- [ ] **SCL-17** (w1, WP-46) Create `tools/scale-k6/scripts/backfill.js` (used by GSY-04); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/backfill.js && k6 inspect tools/scale-k6/scripts/backfill.js`
- [ ] **SCL-18** (w1, WP-46) Create `tools/scale-k6/scripts/million-users.js` (used by SCL-02, DEP-09); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/million-users.js && k6 inspect tools/scale-k6/scripts/million-users.js`
- [ ] **SCL-19** (w1, WP-46) Create `tools/scale-k6/scripts/soak.js` (used by SCL-03); it must parse under k6. Proof: `test -f tools/scale-k6/scripts/soak.js && k6 inspect tools/scale-k6/scripts/soak.js`
- [ ] **SCL-20** (w2, WP-46) Create the EXPLAIN SQL files in `tools/scale-k6/explain/` named by other checklists (migration-locks.sql, gate-check.sql, search.sql, cursor-upsert.sql, graph-hot.sql, rls-cost.sql); each runs against the seeded database. Proof: `for e in migration-locks gate-check search cursor-upsert graph-hot rls-cost; do test -s tools/scale-k6/explain/$e.sql && psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f tools/scale-k6/explain/$e.sql > /dev/null || exit 1; done`
- [x] **SCL-Q1** (w2, WP-46) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/scale-k6`
- [ ] **SCL-Q2** (w3, WP-46) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/scale-k6 exec stryker run`
- [ ] **SCL-Q3** (w2, WP-46) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
