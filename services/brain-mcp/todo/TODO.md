# brain-mcp (MCP): completion checklist

Done: **20.3% (12/59)**, 4 of 17 items. Evidence date 2026-11-13.

Scope: Model Context Protocol server: agents read the brain with their user's permissions.

Package: `@anvesx/brain-mcp`. Lead WP: WP-26. Builder / reviewer: Kiro glm-5 / Codex. Owner agent: unassigned.

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

- [x] **MCP-01** (w3, WP-26) Anonymous call gets 401 with WWW-Authenticate resource_metadata. Proof: `pnpm --filter @anvesx/brain-mcp exec vitest run tests/integration/hardening/bearer.test.ts --config ../../vitest.config.ts`
- [x] **MCP-02** (w3, WP-26) Session cookie alone is refused; bearer token required. Proof: `pnpm --filter @anvesx/brain-mcp exec vitest run tests/integration/hardening/bearer.test.ts --config ../../vitest.config.ts`
- [x] **MCP-03** (w4, WP-26) Hidden and missing nodes return the same NOT_FOUND. Proof: `pnpm --filter @anvesx/brain-mcp exec vitest run tests/unit/read/node.test.ts --config ../../vitest.config.ts`
- [ ] **MCP-04** (w5, WP-26) Uses the shared gate with live recheck; src/access/visible.ts deleted (leaks 2, 3). Proof: `pnpm vitest run tests/contract/leak-mcp-recheck.test.ts`
- [ ] **MCP-05** (w5, WP-26) Revoked agent token refused on the next request, not 15 min later (leak 6). Proof: `pnpm vitest run tests/contract/leak-token-revoke.test.ts`
- [ ] **MCP-06** (w4, WP-26) Dynamic client registration needs admin approval; consent names publisher, redirect host and read-only scope in plain words (leak 6, PM F6). Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/mcp-consent.spec.ts`
- [ ] **MCP-07** (w4, WP-26) Node detail returns only allow-listed fields per node kind (leak 7). Proof: `pnpm vitest run tests/contract/leak-node-fields.test.ts`
- [ ] **MCP-08** (w4, WP-26) Agent sees only granted sources; write tools absent without a grant (Slite, access; GBrain, access). Proof: `pnpm vitest run tests/contract/mcp-grants.test.ts`
- [ ] **MCP-09** (w3, WP-26) List tools return summaries; detail only on request (Meta, disclosure). Proof: `pnpm vitest run tests/contract/disclosure.test.ts`
- [ ] **MCP-10** (w3, WP-26) Sessions stored in Postgres; a session opened on instance A works on instance B. Proof: `pnpm vitest run tests/contract/mcp-two-instance.test.ts`
- [ ] **MCP-11** (w3, WP-26) Per-token rate limit returns 429 with Retry-After. Proof: `pnpm vitest run tests/contract/mcp-ratelimit.test.ts`
- [ ] **MCP-12** (w3, WP-26) Every tool call writes an audit_event with user, client and target. Proof: `pnpm vitest run tests/contract/mcp-audit.test.ts`
- [ ] **MCP-13** (w4, WP-26) brain.search p95 under 200 ms at 500 requests per second over 100,000 files. Proof: `k6 run tools/scale-k6/scripts/mcp-search.js`
- [ ] **MCP-14** (w4, WP-41) A real MCP client (Claude Code) installs, authorizes and searches end to end. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/mcp-real-client.spec.ts`
- [x] **MCP-Q1** (w2, WP-26) Typecheck and default test tier green. Proof: `pnpm turbo run test typecheck --filter=@anvesx/brain-mcp`
- [ ] **MCP-Q2** (w3, WP-26) Line coverage at least 90% with the feature flag on; Stryker score at least 80 with no waiver. Proof: `pnpm --filter @anvesx/brain-mcp exec stryker run`
- [ ] **MCP-Q3** (w2, WP-26) Size, shape and fake-guard clean, and a different-vendor reviewer's EVIDENCE.md says PASS. Proof: `pnpm structure && pnpm guard:fakes`

Ticks for the Q1 test item replay a cached turbo run of identical inputs (46/46 green).
