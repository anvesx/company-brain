# RAG contract (apps/rag, separate repo): completion checklist

Done: **0.0% (0/17)**, 0 of 4 items. Evidence date 2026-11-13.

Scope: The boundary between the graph brain and the text RAG product (ADR 0004, 0005).

Package: `@anvesx/-`. Lead WP: WP-37. Builder / reviewer: Codex / Claude verifier. Owner agent: unassigned.

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

- [ ] **RAG-01** (w5, WP-37) Cross-repo contract test: brain stores no document text. Proof: `pnpm vitest run tests/contract/rag-boundary.test.ts`
- [ ] **RAG-02** (w5, WP-37) RAG never returns a passage the gate hides. Proof: `pnpm vitest run tests/contract/leak-rag.test.ts`
- [ ] **RAG-03** (w3, WP-37) Versioned API; old client still works after a minor bump. Proof: `pnpm vitest run tests/contract/rag-compat.test.ts`
- [ ] **RAG-04** (w4, WP-37) Ask, cited answer, open source works on staging with real accounts. Proof: `pnpm --filter @anvesx/e2e exec playwright test tests/large/acceptance/ask-live.spec.ts`
